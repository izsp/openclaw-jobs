"use client";

import { useState, useEffect, useCallback } from "react";

interface CodeBlockProps {
  language: string;
  code: string;
}

const SUPPORTED_LANGUAGES = new Set([
  "javascript", "typescript", "python", "rust", "go",
  "html", "css", "sql", "bash", "json", "jsx", "tsx",
  "sh", "shell", "js", "ts", "py",
]);

/** Resolves language aliases to canonical names. */
function resolveLanguage(lang: string): string {
  const aliases: Record<string, string> = {
    js: "javascript", ts: "typescript", py: "python",
    sh: "bash", shell: "bash", jsx: "jsx", tsx: "tsx",
  };
  return aliases[lang] ?? lang;
}

/** Code block with lazy-loaded syntax highlighting and copy button. */
export function CodeBlock({ language, code }: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resolvedLang = resolveLanguage(language);
  const canHighlight = SUPPORTED_LANGUAGES.has(language);

  useEffect(() => {
    if (!canHighlight) return;
    let cancelled = false;

    async function highlight() {
      try {
        const { codeToHtml } = await import("shiki");
        const html = await codeToHtml(code, {
          lang: resolvedLang,
          theme: "github-dark-default",
        });
        if (!cancelled) setHighlightedHtml(html);
      } catch {
        // Fallback to plain text on failure
      }
    }

    void highlight();
    return () => { cancelled = true; };
  }, [code, resolvedLang, canHighlight]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="group relative my-2 rounded-lg bg-zinc-950 text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 text-zinc-500">
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {highlightedHtml ? (
        <div
          className="overflow-x-auto px-3 pb-3 [&_pre]:!bg-transparent [&_pre]:!p-0"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="overflow-x-auto px-3 pb-3 leading-relaxed text-zinc-300">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
