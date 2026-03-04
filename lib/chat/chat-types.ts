/**
 * Shared types for the chat system.
 */

/** Metadata attached to assistant messages that represent task results. */
export interface ResultMetadata {
  task_id: string;
  task_type: string;
  price_cents: number;
  completed_at: string;
  worker_display_name: string | null;
  worker_avatar_url: string | null;
  word_count: number;
  duration_seconds: number;
  format: string;
}

/** A single message in a chat conversation. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  result_meta?: ResultMetadata;
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
