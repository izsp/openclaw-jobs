"use client";

import { useState, useEffect, useCallback } from "react";
import type { HeadingArtifact } from "@/lib/chat/artifact-types";

interface DocumentOutlineProps {
  headings: HeadingArtifact[];
  /** ID of the scrollable container to observe. */
  scrollContainerId: string;
}

/** Sidebar outline navigation with IntersectionObserver-based active tracking. */
export function DocumentOutline({
  headings,
  scrollContainerId,
}: DocumentOutlineProps) {
  const [activeSlug, setActiveSlug] = useState<string>("");

  useEffect(() => {
    const container = document.getElementById(scrollContainerId);
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id);
          }
        }
      },
      { root: container, rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );

    for (const h of headings) {
      if (!h.slug) continue;
      const el = container.querySelector(`#${CSS.escape(h.slug)}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings, scrollContainerId]);

  const handleClick = useCallback(
    (slug: string) => {
      if (!slug) return;
      const container = document.getElementById(scrollContainerId);
      const el = container?.querySelector(`#${CSS.escape(slug)}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [scrollContainerId],
  );

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-0.5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Outline
      </div>
      {headings.map((h) => (
        <button
          key={h.id}
          onClick={() => handleClick(h.slug)}
          className={`block w-full truncate rounded px-2 py-1 text-left text-xs transition-colors ${
            activeSlug === h.slug
              ? "bg-zinc-700/50 text-orange-400"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
          style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
          title={h.text}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
}
