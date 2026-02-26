/**
 * localStorage-based chat history persistence.
 * Conversations are stored per-user to prevent cross-session leakage.
 */
import type { ChatConversation, ConversationSummary } from "./chat-types";

const STORAGE_PREFIX = "openclaw_chats_";
const MAX_CONVERSATIONS = 50;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

/** Loads all conversations for a user from localStorage. */
export function loadConversations(userId: string): ChatConversation[] {
  if (typeof globalThis.localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ChatConversation[];
  } catch {
    return [];
  }
}

/** Saves all conversations for a user to localStorage. */
export function saveConversations(userId: string, conversations: ChatConversation[]): void {
  if (typeof globalThis.localStorage === "undefined") return;
  const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
  localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
}

/** Adds or updates a single conversation. */
export function upsertConversation(userId: string, conversation: ChatConversation): void {
  const all = loadConversations(userId);
  const idx = all.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) {
    all[idx] = conversation;
  } else {
    all.unshift(conversation);
  }
  saveConversations(userId, all);
}

/** Deletes a conversation by ID. */
export function deleteConversation(userId: string, conversationId: string): void {
  const all = loadConversations(userId);
  saveConversations(userId, all.filter((c) => c.id !== conversationId));
}

/** Returns a summary list for the sidebar. */
export function listConversations(userId: string): ConversationSummary[] {
  return loadConversations(userId).map((c) => ({
    id: c.id,
    task_id: c.task_id,
    task_status: c.task_status,
    preview: c.messages[0]?.content.slice(0, 80) ?? "",
    message_count: c.messages.length,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));
}

/** Clears all chat history for a user. */
export function clearAllConversations(userId: string): void {
  if (typeof globalThis.localStorage === "undefined") return;
  localStorage.removeItem(storageKey(userId));
}
