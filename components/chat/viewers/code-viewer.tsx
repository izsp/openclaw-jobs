"use client";

import { useState, useCallback } from "react";
import { CodeBlock } from "@/components/chat/code-block";
import { downloadFile } from "@/lib/chat/download-file";

interface CodeFile {
  id: string;
  language: string;
  code: string;
  filename: string | null;
}

interface CodeViewerProps {
  files: CodeFile[];
}

/** Returns the display label for a code file tab. */
function getTabLabel(file: CodeFile, index: number): string {
  return file.filename ?? `File ${index + 1}`;
}

/** Returns a download-safe filename with appropriate extension. */
function getDownloadName(file: CodeFile, index: number): string {
  if (file.filename) return file.filename;
  const ext = file.language || "txt";
  return `file-${index + 1}.${ext}`;
}

/** Returns the MIME type for a given language. */
function getMimeType(language: string): string {
  const mimeMap: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    json: "application/json",
    javascript: "application/javascript",
    typescript: "application/typescript",
    python: "text/x-python",
    sql: "application/sql",
    xml: "application/xml",
  };
  return mimeMap[language] ?? "text/plain";
}

/**
 * Multi-file code viewer with tab switching and per-file download.
 * Renders a single CodeBlock when only one file is provided,
 * or a tabbed interface for multiple files.
 */
export function CodeViewer({ files }: CodeViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleDownload = useCallback(
    (file: CodeFile, index: number) => {
      const filename = getDownloadName(file, index);
      downloadFile(file.code, filename, getMimeType(file.language));
    },
    [],
  );

  if (files.length === 0) return null;

  if (files.length === 1) {
    return (
      <SingleFileView
        file={files[0]}
        onDownload={() => handleDownload(files[0], 0)}
      />
    );
  }

  const activeFile = files[activeIndex];

  return (
    <div className="my-2 rounded-lg border border-edge bg-surface-alt">
      <TabBar
        files={files}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
      />
      <div className="relative">
        <DownloadButton
          onClick={() => handleDownload(activeFile, activeIndex)}
        />
        <CodeBlock language={activeFile.language} code={activeFile.code} />
      </div>
    </div>
  );
}

interface SingleFileViewProps {
  file: CodeFile;
  onDownload: () => void;
}

/** Renders a single code file with a download button overlay. */
function SingleFileView({ file, onDownload }: SingleFileViewProps) {
  return (
    <div className="relative my-2">
      <DownloadButton onClick={onDownload} />
      <CodeBlock language={file.language} code={file.code} />
    </div>
  );
}

interface TabBarProps {
  files: CodeFile[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Horizontal tab bar for switching between code files. */
function TabBar({ files, activeIndex, onSelect }: TabBarProps) {
  return (
    <div className="flex overflow-x-auto border-b border-edge">
      {files.map((file, i) => (
        <button
          key={file.id}
          onClick={() => onSelect(i)}
          className={`whitespace-nowrap px-3 py-1.5 text-[10px] font-medium transition-colors ${
            i === activeIndex
              ? "border-b-2 border-accent text-accent"
              : "text-content-tertiary hover:bg-surface-alt hover:text-content-secondary"
          }`}
        >
          {getTabLabel(file, i)}
        </button>
      ))}
    </div>
  );
}

interface DownloadButtonProps {
  onClick: () => void;
}

/** Small download icon button positioned in the top-right corner. */
function DownloadButton({ onClick }: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      title="Download file"
      className="absolute right-2 top-1 z-10 rounded px-1.5 py-0.5 text-[10px] text-content-tertiary transition-colors hover:bg-surface-alt hover:text-content-secondary"
    >
      &#8615;
    </button>
  );
}
