"use client";

import { useState, useCallback } from "react";
import { CodeBlock } from "@/components/chat/code-block";
import { downloadFile } from "@/lib/chat/download-file";

interface HtmlPreviewProps {
  html: string;
  id: string;
}

type ViewTab = "preview" | "source";

/**
 * Sandboxed HTML preview with source code view.
 * Renders HTML content in an iframe with restricted sandbox permissions,
 * and provides a tabbed interface to switch between live preview and source view.
 */
export function HtmlPreview({ html, id }: HtmlPreviewProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("preview");

  const handleDownload = useCallback(() => {
    downloadFile(html, `preview-${id}.html`, "text/html;charset=utf-8");
  }, [html, id]);

  return (
    <div className="my-2 rounded-lg border border-zinc-700/50 bg-zinc-900" data-testid="html-preview">
      <div className="flex items-center justify-between border-b border-zinc-700/50 px-3 py-1.5">
        <div className="flex gap-2">
          <TabButton
            label="Preview"
            active={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
          />
          <TabButton
            label="Source"
            active={activeTab === "source"}
            onClick={() => setActiveTab("source")}
          />
        </div>
        <button
          onClick={handleDownload}
          className="rounded px-2 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Download .html
        </button>
      </div>
      {activeTab === "preview" ? (
        <PreviewPane html={html} />
      ) : (
        <SourcePane html={html} />
      )}
    </div>
  );
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** Small toggle button for switching between Preview and Source tabs. */
function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
        active
          ? "bg-zinc-800 text-orange-400"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

interface PreviewPaneProps {
  html: string;
}

/** Renders the HTML content in a sandboxed iframe. */
function PreviewPane({ html }: PreviewPaneProps) {
  return (
    <div className="h-[400px] w-full bg-white">
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        title="HTML Preview"
        className="h-full w-full border-0"
      />
    </div>
  );
}

interface SourcePaneProps {
  html: string;
}

/** Renders the raw HTML source code with syntax highlighting. */
function SourcePane({ html }: SourcePaneProps) {
  return (
    <div className="max-h-[400px] overflow-auto">
      <CodeBlock language="html" code={html} />
    </div>
  );
}
