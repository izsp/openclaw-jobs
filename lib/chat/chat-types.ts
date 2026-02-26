/**
 * Shared types for the chat system.
 */

/** A single message in a chat conversation. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

/** A chat conversation with an associated task. */
export interface ChatConversation {
  id: string;
  task_id: string | null;
  task_status: string | null;
  price_cents: number | null;
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
}

/** Summary of a conversation for the history list. */
export interface ConversationSummary {
  id: string;
  task_id: string | null;
  task_status: string | null;
  preview: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}
