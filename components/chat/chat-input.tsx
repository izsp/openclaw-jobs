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
    <div className="flex items-end gap-2">
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Describe your task..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-xl border border-input-border bg-input-bg px-3 pb-2.5 pt-8 text-sm leading-relaxed text-content placeholder-content-tertiary outline-none transition-colors focus:border-input-focus md:px-4 md:pb-3 md:pt-9"
        />
        {/* Depth selector pinned to top-left of textarea */}
        <div className="absolute left-1.5 top-1.5 md:left-2 md:top-2">
          <DepthSelector settings={depth} onChange={setDepth} disabled={disabled} />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-xl bg-content px-4 py-2.5 text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-30 md:px-5 md:py-3"
      >
        Send
      </button>
    </div>
  );
}
