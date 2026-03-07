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
          className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-orange-500 md:px-4 md:py-3"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-orange-400 disabled:opacity-40 disabled:hover:bg-orange-500 md:px-5 md:py-3"
        >
          Send
        </button>
      </form>
    </div>
  );
}
