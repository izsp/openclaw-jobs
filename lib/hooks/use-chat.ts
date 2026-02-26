/**
 * React hook orchestrating the full chat → task → result flow.
 * Manages conversation state, submits tasks, polls for results, and
 * persists everything to localStorage via chat-storage.
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatMessage, ChatConversation } from "@/lib/chat/chat-types";
import { upsertConversation, loadConversations } from "@/lib/chat/chat-storage";
import { submitTask } from "@/lib/api/task-client";
import { getTaskStatus, type TaskStatus } from "@/lib/api/task-client";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(["completed", "failed", "expired", "credited"]);

interface UseChatReturn {
  conversation: ChatConversation | null;
  sending: boolean;
  polling: boolean;
  error: string | null;
  /** Send a message, which submits a task and starts polling. */
  send: (content: string) => Promise<void>;
  /** Start a fresh conversation. */
  reset: () => void;
  /** Load an existing conversation by ID. */
  loadById: (conversationId: string) => void;
}

function createConversation(): ChatConversation {
  return {
    id: crypto.randomUUID(),
    task_id: null,
    task_status: null,
    price_cents: null,
    messages: [],
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
}

export function useChat(userId: string | null): UseChatReturn {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist conversation to localStorage whenever it changes.
  useEffect(() => {
    if (userId && conversation) {
      upsertConversation(userId, conversation);
    }
  }, [userId, conversation]);

  // Clean up polling on unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }, []);

  const startPolling = useCallback((taskId: string) => {
    setPolling(true);

    async function poll() {
      try {
        const status: TaskStatus = await getTaskStatus(taskId);

        setConversation((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, task_status: status.status, updated_at: Date.now() };

          if (status.status === "completed" && status.output) {
            const alreadyHasResult = prev.messages.some(
              (m) => m.role === "assistant" && m.content === status.output,
            );
            if (!alreadyHasResult) {
              updated.messages = [...prev.messages, createMessage("assistant", status.output)];
            }
          }
          return updated;
        });

        if (TERMINAL_STATUSES.has(status.status)) {
          stopPolling();
        }
      } catch {
        stopPolling();
      }
    }

    void poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const send = useCallback(async (content: string) => {
    if (!userId) return;
    setError(null);
    setSending(true);

    try {
      const conv = conversation ?? createConversation();
      const userMsg = createMessage("user", content);
      const updated: ChatConversation = {
        ...conv,
        messages: [...conv.messages, userMsg],
        updated_at: Date.now(),
      };
      setConversation(updated);

      // Build input with full conversation context for multi-turn.
      const allMessages = updated.messages.map((m) => `${m.role}: ${m.content}`).join("\n");

      const result = await submitTask({
        type: "chat",
        input: allMessages,
        input_preview: content.slice(0, 100),
      });

      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          task_id: result.task_id,
          task_status: "pending",
          price_cents: result.price_cents,
          updated_at: Date.now(),
        };
      });

      startPolling(result.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [userId, conversation, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setConversation(null);
    setError(null);
  }, [stopPolling]);

  const loadById = useCallback((conversationId: string) => {
    if (!userId) return;
    stopPolling();
    const all = loadConversations(userId);
    const found = all.find((c) => c.id === conversationId) ?? null;
    setConversation(found);
  }, [userId, stopPolling]);

  return { conversation, sending, polling, error, send, reset, loadById };
}
