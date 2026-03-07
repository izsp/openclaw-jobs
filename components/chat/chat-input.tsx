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
    <div className="rounded-xl border border-input-border bg-input-bg transition-colors focus-within:border-input-focus">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); autoResize(); }}
        onKeyDown={handleKeyDown}
        placeholder="Describe your task..."
        disabled={disabled}
        rows={1}
        className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-base leading-relaxed text-content placeholder-content-tertiary outline-none md:px-4 md:pt-3 md:text-sm"
      />
      {/* Bottom toolbar: depth selector + send */}
      <div className="flex items-center justify-between px-2 pb-2 md:px-3">
        <DepthSelector settings={depth} onChange={setDepth} disabled={disabled} />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-lg bg-content px-3.5 py-1.5 text-xs font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          Send
        </button>
      </div>
    </div>
  );
}
