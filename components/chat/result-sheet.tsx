"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { ResultMetadata } from "@/lib/chat/chat-types";
import { ResultContent } from "./result-content";
import { AttachmentList } from "./viewers/attachment-list";

interface ResultSheetProps {
  content: string;
  meta: ResultMetadata;
  onClose: () => void;
  onCredit: (taskId: string) => Promise<boolean>;
  credited?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

const SCROLL_THRESHOLD = 12;

/**
 * Full-screen mobile reader — Medium-style immersive reading.
 * Portals to body for native document scrolling so iOS Safari
 * collapses the address bar automatically.
 */
export function ResultSheet({
  content,
  meta,
  onClose,
  onCredit,
  credited,
}: ResultSheetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creditState, setCreditState] = useState<"idle" | "loading" | "done">(
    credited ? "done" : "idle",
  );
  const [headerVisible, setHeaderVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const savedScrollY = useRef(0);

  // WHY: Portal to body and hide app content so the document itself scrolls.
  // iOS Safari only collapses the address bar on native document scroll.
  useEffect(() => {
    setMounted(true);
    savedScrollY.current = window.scrollY;
    const appRoot = document.getElementById("__next");
    if (appRoot) appRoot.style.display = "none";
    window.scrollTo(0, 0);

    return () => {
      if (appRoot) appRoot.style.display = "";
      window.scrollTo(0, savedScrollY.current);
    };
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // WHY: Native window scroll handler — Medium-style header hide/show + progress.
  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      // Progress
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min(currentY / docHeight, 1));
      }

      // Header
      if (delta > SCROLL_THRESHOLD) {
        setHeaderVisible(false);
        setMenuOpen(false);
      } else if (delta < -SCROLL_THRESHOLD) {
        setHeaderVisible(true);
      }

      if (currentY < 10) setHeaderVisible(true);

      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setMenuOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleCredit = useCallback(async () => {
    setCreditState("loading");
    setMenuOpen(false);
    const ok = await onCredit(meta.task_id);
    setCreditState(ok ? "done" : "idle");
  }, [onCredit, meta.task_id]);

  const displayName = meta.worker_display_name ?? "Lobster";

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Reading progress bar — fixed at very top */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent pointer-events-none">
        <div
          className="h-full bg-content-tertiary transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Header — fixed, slides up/down */}
      <div
        className={`fixed inset-x-0 top-0 z-50 bg-page/95 backdrop-blur-sm transition-transform duration-250 ease-out ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg p-1.5 text-sm text-content-secondary transition-colors hover:text-content"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-edge bg-elevated py-1 shadow-lg">
                <div className="border-b border-edge px-3 py-2 space-y-0.5">
                  <p className="text-xs text-content-secondary">{displayName}</p>
                  <p className="text-[11px] text-content-tertiary">
                    {formatDuration(meta.duration_seconds)} · {meta.word_count.toLocaleString()} words · {meta.price_cents} shrimp
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full px-3 py-2.5 text-left text-sm text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
                >
                  {copied ? "Copied!" : "Copy text"}
                </button>
                <button
                  onClick={handleCredit}
                  disabled={creditState !== "idle"}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-alt disabled:opacity-50 ${
                    creditState === "done" ? "text-status-success" : "text-content-secondary hover:text-content"
                  }`}
                >
                  {creditState === "done" ? "Credited" : creditState === "loading" ? "Crediting..." : "Request credit"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content — normal document flow, native scroll */}
      <div className="min-h-dvh bg-page animate-slide-up">
        <div className="pt-12" />
        <div className="mx-auto max-w-2xl px-4">
          <ResultContent content={content} format={meta.format} />
          {meta.attachments && meta.attachments.length > 0 && (
            <AttachmentList attachments={meta.attachments} taskId={meta.task_id} />
          )}
        </div>
        <div className="h-24" />
      </div>
    </>,
    document.body,
  );
}
