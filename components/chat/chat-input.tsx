"use client";

import { useState, useRef, useCallback } from "react";
import { DepthSelector } from "./depth-selector";
import type { DepthSettings } from "@/lib/chat/depth-types";
import { DEFAULT_DEPTH_SETTINGS } from "@/lib/chat/depth-types";

interface ChatInputProps {
  onSend: (message: string, depth: DepthSettings) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [depth, setDepth] = useState<DepthSettings>(DEFAULT_DEPTH_SETTINGS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, depth);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // WHY: During IME composition (e.g. Chinese pinyin), Enter confirms
    // the composed text — it must NOT trigger send.
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-2">
      <DepthSelector settings={depth} onChange={setDepth} disabled={disabled} />
      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Describe your task..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-input-border bg-input-bg px-3 py-2.5 text-sm leading-relaxed text-content placeholder-content-tertiary outline-none transition-colors focus:border-input-focus md:px-4 md:py-3"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-xl bg-content px-4 py-2.5 text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-30 md:px-5 md:py-3"
        >
          Send
        </button>
      </form>
    </div>
  );
}
