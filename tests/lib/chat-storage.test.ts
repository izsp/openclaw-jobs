/**
 * Tests for localStorage-based chat persistence (lib/chat/chat-storage.ts).
 * Uses a mock localStorage to simulate browser environment.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadConversations,
  saveConversations,
  upsertConversation,
  deleteConversation,
  listConversations,
  clearAllConversations,
} from "@/lib/chat/chat-storage";
import type { ChatConversation } from "@/lib/chat/chat-types";

// Mock localStorage
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

function makeConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: crypto.randomUUID(),
    task_id: null,
    task_status: null,
    price_cents: null,
    messages: [],
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

describe("chat-storage", () => {
  const userId = "user_abc";

  it("should return empty array for new user", () => {
    expect(loadConversations(userId)).toEqual([]);
  });

  it("should round-trip save and load conversations", () => {
    const conv = makeConversation({ id: "conv_1" });
    saveConversations(userId, [conv]);

    const loaded = loadConversations(userId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("conv_1");
  });

  it("should upsert a new conversation to the front", () => {
    const existing = makeConversation({ id: "old" });
    saveConversations(userId, [existing]);

    const fresh = makeConversation({ id: "new" });
    upsertConversation(userId, fresh);

    const loaded = loadConversations(userId);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("new");
    expect(loaded[1].id).toBe("old");
  });

  it("should update an existing conversation in place", () => {
    const conv = makeConversation({ id: "conv_1", task_status: "pending" });
    saveConversations(userId, [conv]);

    const updated = { ...conv, task_status: "completed" };
    upsertConversation(userId, updated);

    const loaded = loadConversations(userId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].task_status).toBe("completed");
  });

  it("should delete a conversation by ID", () => {
    const a = makeConversation({ id: "a" });
    const b = makeConversation({ id: "b" });
    saveConversations(userId, [a, b]);

    deleteConversation(userId, "a");

    const loaded = loadConversations(userId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("b");
  });

  it("should list conversations with summaries", () => {
    const conv = makeConversation({
      id: "conv_1",
      task_id: "task_abc",
      task_status: "completed",
      messages: [
        { id: "m1", role: "user", content: "Analyze this code for security vulnerabilities", timestamp: 1 },
        { id: "m2", role: "assistant", content: "Found 3 issues...", timestamp: 2 },
      ],
    });
    saveConversations(userId, [conv]);

    const summaries = listConversations(userId);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].task_id).toBe("task_abc");
    expect(summaries[0].task_status).toBe("completed");
    expect(summaries[0].preview).toBe("Analyze this code for security vulnerabilities");
    expect(summaries[0].message_count).toBe(2);
  });

  it("should truncate preview to 80 characters", () => {
    const longMessage = "A".repeat(200);
    const conv = makeConversation({
      messages: [{ id: "m1", role: "user", content: longMessage, timestamp: 1 }],
    });
    saveConversations(userId, [conv]);

    const summaries = listConversations(userId);
    expect(summaries[0].preview.length).toBe(80);
  });

  it("should clear all conversations for a user", () => {
    saveConversations(userId, [makeConversation(), makeConversation()]);
    expect(loadConversations(userId)).toHaveLength(2);

    clearAllConversations(userId);
    expect(loadConversations(userId)).toEqual([]);
  });

  it("should enforce max 50 conversations limit", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      makeConversation({ id: `conv_${i}` }),
    );
    saveConversations(userId, many);

    const loaded = loadConversations(userId);
    expect(loaded).toHaveLength(50);
    expect(loaded[0].id).toBe("conv_0");
  });

  it("should handle corrupted localStorage gracefully", () => {
    store.set("openclaw_chats_user_abc", "not valid json{{{");
    expect(loadConversations(userId)).toEqual([]);
  });

  it("should isolate storage between users", () => {
    saveConversations("user_1", [makeConversation({ id: "c1" })]);
    saveConversations("user_2", [makeConversation({ id: "c2" })]);

    expect(loadConversations("user_1")).toHaveLength(1);
    expect(loadConversations("user_1")[0].id).toBe("c1");
    expect(loadConversations("user_2")[0].id).toBe("c2");
  });
});
