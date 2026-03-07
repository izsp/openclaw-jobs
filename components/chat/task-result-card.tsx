"use client";

import type { ChatMessage } from "@/lib/chat/chat-types";
import { ResultPreview } from "./result-preview";

interface TaskResultCardProps {
  message: ChatMessage;
  /** Called when user clicks to open full result view. */
  onOpen: (message: ChatMessage) => void;
}

/**
 * Compact result card rendered in the chat flow.
 * Shows a truncated preview with gradient fade — no inner scroll.
 * Delegates full viewing to the parent (side panel on desktop, sheet on mobile).
 */
export function TaskResultCard({ message, onOpen }: TaskResultCardProps) {
  const meta = message.result_meta;
  if (!meta) return null;

  return (
    <ResultPreview
      content={message.content}
      meta={meta}
      onOpen={() => onOpen(message)}
    />
  );
}
