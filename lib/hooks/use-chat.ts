/**
 * React hook orchestrating the full chat → task → result flow.
 * Manages conversation state, submits tasks, polls for results, and
 * persists everything to localStorage via chat-storage.
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatMessage, ChatConversation, ResultMetadata } from "@/lib/chat/chat-types";
import { upsertConversation, loadConversations } from "@/lib/chat/chat-storage";
import { submitTask, cancelTask as apiCancelTask, creditTask as apiCreditTask } from "@/lib/api/task-client";
import { getTaskStatus, type TaskStatus } from "@/lib/api/task-client";
import { ApiError } from "@/lib/api/fetch-api";
import type { DepthSettings } from "@/lib/chat/depth-types";
import { DEPTH_CONFIGS, DEFAULT_DEPTH_SETTINGS, buildDepthSystemPrompt } from "@/lib/chat/depth-types";

const POLL_INTERVAL_MS = 3000;
const POLL_BACKOFF_MS = 6000;
const MAX_POLL_ERRORS = 10;
const TERMINAL_STATUSES = new Set(["completed", "failed", "expired", "credited"]);

interface UseChatOptions {
  /** Pre-assigned worker ID for directed tasks. */
  assignedWorkerId?: string | null;
}

interface UseChatReturn {
  conversation: ChatConversation | null;
  sending: boolean;
  polling: boolean;
  error: string | null;
  /** Send a message, which submits a task and starts polling. */
  send: (content: string, depth?: DepthSettings) => Promise<void>;
  /** Cancel the current pending/assigned task. */
  cancel: () => Promise<void>;
  /** Request credit (refund) for a completed task. Returns true on success. */
  credit: (taskId: string) => Promise<boolean>;
  /** Retry the last failed task by re-sending the last user message. */
  retry: () => Promise<void>;
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
    last_worker_id: null,
    messages: [],
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  resultMeta?: ResultMetadata,
): ChatMessage {
  const msg: ChatMessage = { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
  if (resultMeta) msg.result_meta = resultMeta;
  return msg;
}

/** Builds ResultMetadata from a completed task status response. */
function buildResultMeta(status: TaskStatus): ResultMetadata {
  const content = status.output?.content ?? "";
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const createdMs = new Date(status.created_at).getTime();
  const completedMs = status.completed_at
    ? new Date(status.completed_at).getTime()
    : Date.now();
  const durationSeconds = Math.max(0, (completedMs - createdMs) / 1000);

  const meta: ResultMetadata = {
    task_id: status.task_id,
    task_type: status.type,
    price_cents: status.price_cents,
    completed_at: status.completed_at ?? new Date().toISOString(),
    worker_display_name: status.worker_display_name ?? null,
    worker_avatar_url: status.worker_avatar_url ?? null,
    word_count: wordCount,
    duration_seconds: Math.round(durationSeconds * 10) / 10,
    format: status.output?.format ?? "markdown",
  };

  if (status.output?.attachments && status.output.attachments.length > 0) {
    meta.attachments = status.output.attachments;
  }

  return meta;
}

export function useChat(userId: string | null, options?: UseChatOptions): UseChatReturn {
  const assignedWorkerId = options?.assignedWorkerId ?? null;
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

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
    // WHY: Clean up any stale polling before starting a new cycle.
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(true);
    let errorCount = 0;

    function applyPollResult(status: TaskStatus) {
      setConversation((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, task_status: status.status, updated_at: Date.now() };

        // WHY: Save worker_id for sticky multi-turn — subsequent messages
        // in this conversation will be routed to the same worker.
        if (status.worker_id) {
          updated.last_worker_id = status.worker_id;
        }

        // WHY: also handle "credited" — QA review can auto-credit between polls
        if ((status.status === "completed" || status.status === "credited") && status.output) {
          const outputText = status.output.content;
          // WHY: Dedup by task_id, NOT by content. Content-based dedup would
          // skip adding the response if the worker happens to give the same
          // answer twice (e.g. due to missing context on retry).
          const alreadyHasResult = prev.messages.some(
            (m) => m.role === "assistant" && m.result_meta?.task_id === taskId,
          );
          if (!alreadyHasResult) {
            const meta = buildResultMeta(status);
            updated.messages = [
              ...prev.messages,
              createMessage("assistant", outputText, meta),
            ];
          }
        }
        return updated;
      });
    }

    async function poll() {
      try {
        const status: TaskStatus = await getTaskStatus(taskId);
        errorCount = 0;
        setError(null);
        applyPollResult(status);

        if (TERMINAL_STATUSES.has(status.status)) {
          stopPolling();
        }
      } catch (err) {
        errorCount++;
        // WHY: 429 and network errors are transient — back off instead of
        // killing the poll entirely. Only give up after MAX_POLL_ERRORS.
        const isTransient = err instanceof ApiError && (err.status === 429 || err.status >= 500);
        if (isTransient && errorCount < MAX_POLL_ERRORS) {
          reschedule(POLL_BACKOFF_MS);
          return;
        }
        setError(err instanceof Error ? err.message : "Connection lost — please refresh");
        stopPolling();
      }
    }

    // WHY: After a transient error, reschedule with longer interval to
    // avoid hammering a rate-limited endpoint.
    function reschedule(delayMs: number) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setTimeout(() => {
        void poll();
        pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
      }, delayMs) as unknown as ReturnType<typeof setInterval>;
    }

    void poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [stopPolling]);

  // WHY: Store last depth settings so retry() can re-use them.
  const lastDepthRef = useRef<DepthSettings>(DEFAULT_DEPTH_SETTINGS);

  const send = useCallback(async (content: string, depth?: DepthSettings) => {
    if (!userId) return;
    setError(null);
    setSending(true);

    const depthSettings = depth ?? DEFAULT_DEPTH_SETTINGS;
    lastDepthRef.current = depthSettings;

    try {
      let conv = conversationRef.current ?? createConversation();

      // WHY: Recovery — if the previous task completed but the assistant message
      // is missing (e.g. poll was interrupted by 429 or network error), fetch the
      // result now so the worker gets full conversation context.
      if (conv.task_id && TERMINAL_STATUSES.has(conv.task_status ?? "")) {
        const hasResult = conv.messages.some(
          (m) => m.role === "assistant" && m.result_meta?.task_id === conv.task_id,
        );
        if (!hasResult) {
          try {
            const status = await getTaskStatus(conv.task_id);
            if (status.output) {
              const meta = buildResultMeta(status);
              conv = {
                ...conv,
                messages: [...conv.messages, createMessage("assistant", status.output.content, meta)],
                updated_at: Date.now(),
              };
              setConversation(conv);
            }
          } catch {
            // Non-critical — proceed with partial context
          }
        }
      }

      const userMsg = createMessage("user", content);
      const updated: ChatConversation = {
        ...conv,
        messages: [...conv.messages, userMsg],
        updated_at: Date.now(),
      };
      setConversation(updated);

      // Build message list, appending depth instructions to the last user message.
      // WHY: system role in messages confuses worker agents — they treat it as
      // the primary prompt and ignore the actual user question. Instead, we
      // append the depth instructions as a postscript to the user's message.
      const systemPrompt = buildDepthSystemPrompt(depthSettings);
      const messages = updated.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      if (systemPrompt && messages.length > 0) {
        const last = messages[messages.length - 1];
        if (last.role === "user") {
          last.content = `${last.content}\n\n---\n[Output Instructions]\n${systemPrompt}`;
        }
      }

      const depthConfig = DEPTH_CONFIGS[depthSettings.level];
      const taskInput: Parameters<typeof submitTask>[0] = {
        type: "chat",
        input: { messages },
        constraints: {
          timeout_seconds: depthConfig.timeoutSeconds,
          min_output_length: depthConfig.minOutputLength,
        },
        input_preview: { text: content.slice(0, 100) },
      };
      // WHY: Sticky multi-turn — route follow-up messages to the same worker.
      // Explicit assignedWorkerId (from worker offering page) takes priority,
      // then fall back to the worker who completed the previous task.
      const stickyWorkerId = assignedWorkerId ?? conv.last_worker_id;
      if (stickyWorkerId) {
        taskInput.assigned_worker_id = stickyWorkerId;
      }
      const result = await submitTask(taskInput);

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
  }, [userId, assignedWorkerId, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setConversation(null);
    setError(null);
  }, [stopPolling]);

  const cancel = useCallback(async () => {
    const conv = conversationRef.current;
    if (!conv?.task_id) return;
    const taskId = conv.task_id;

    try {
      stopPolling();
      await apiCancelTask(taskId);
      setConversation((prev) => {
        if (!prev) return prev;
        return { ...prev, task_status: "failed", updated_at: Date.now() };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel task");
    }
  }, [stopPolling]);

  const credit = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      await apiCreditTask(taskId);
      setConversation((prev) => {
        if (!prev) return prev;
        return { ...prev, task_status: "credited", updated_at: Date.now() };
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const retry = useCallback(async () => {
    const conv = conversationRef.current;
    if (!conv) return;
    const lastUserMsg = [...conv.messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    await send(lastUserMsg.content, lastDepthRef.current);
  }, [send]);

  const loadById = useCallback((conversationId: string) => {
    if (!userId) return;
    stopPolling();
    const all = loadConversations(userId);
    const found = all.find((c) => c.id === conversationId) ?? null;
    setConversation(found);

    if (!found?.task_id) return;

    // WHY: Resume polling if the conversation has an active (non-terminal) task.
    // This handles page refresh / deploy interrupting a previous poll cycle.
    if (found.task_status && !TERMINAL_STATUSES.has(found.task_status)) {
      startPolling(found.task_id);
      return;
    }

    // WHY: Recovery fetch — if the task is terminal but the assistant message
    // is missing, polling was likely killed by a 429 before the result was
    // appended. Do a one-shot fetch to recover the result.
    const hasResult = found.messages.some((m) => m.role === "assistant" && m.result_meta?.task_id === found.task_id);
    if (!hasResult && TERMINAL_STATUSES.has(found.task_status ?? "")) {
      void (async () => {
        try {
          const status = await getTaskStatus(found.task_id!);
          if (status.output) {
            setConversation((prev) => {
              if (!prev) return prev;
              const meta = buildResultMeta(status);
              return {
                ...prev,
                task_status: status.status,
                messages: [...prev.messages, createMessage("assistant", status.output!.content, meta)],
                updated_at: Date.now(),
              };
            });
          }
        } catch {
          // Non-critical — user can still see the conversation
        }
      })();
    }
  }, [userId, stopPolling, startPolling]);

  return { conversation, sending, polling, error, send, cancel, credit, retry, reset, loadById };
}
