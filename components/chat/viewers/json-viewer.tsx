"use client";

import { useState, useCallback } from "react";
import { JsonNode } from "./json-tree-node";

interface JsonViewerProps {
  data: unknown;
  rawJson: string;
  id: string;
}

/**
 * Collapsible JSON tree viewer with color-coded values.
 * Supports expanding/collapsing objects and arrays, a raw JSON view toggle,
 * and a copy-to-clipboard button.
 */
export function JsonViewer({ data, rawJson, id }: JsonViewerProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [rawJson]);

  return (
    <div className="my-2 rounded-lg border border-edge bg-surface-alt" data-testid="json-viewer">
      <div className="flex items-center justify-between border-b border-edge px-3 py-1.5">
        <div className="flex gap-2">
          <TabToggle label="Tree" active={!showRaw} onClick={() => setShowRaw(false)} />
          <TabToggle label="Raw" active={showRaw} onClick={() => setShowRaw(true)} />
        </div>
        <button
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-[10px] text-content-tertiary transition-colors hover:bg-surface-alt hover:text-content-secondary"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="max-h-[500px] overflow-auto p-3 font-mono text-xs">
        {showRaw ? (
          <pre className="whitespace-pre-wrap break-all text-content-secondary">{rawJson}</pre>
        ) : (
          <JsonNode value={data} depth={0} keyName={null} />
        )}
      </div>
    </div>
  );
}

interface TabToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** Small toggle button for switching between Tree and Raw views. */
function TabToggle({ label, active, onClick }: TabToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
        active
          ? "bg-surface-alt text-accent"
          : "text-content-tertiary hover:text-content-secondary"
      }`}
    >
      {label}
    </button>
  );
}
