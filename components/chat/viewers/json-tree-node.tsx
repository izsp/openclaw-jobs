"use client";

import { useState } from "react";

/** Default depth to auto-expand when rendering the JSON tree. */
const DEFAULT_EXPAND_DEPTH = 2;

interface JsonNodeProps {
  value: unknown;
  depth: number;
  keyName: string | null;
}

/** Recursively renders a single JSON node with collapse/expand support. */
export function JsonNode({ value, depth, keyName }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < DEFAULT_EXPAND_DEPTH);

  if (value === null) {
    return <LeafNode keyName={keyName} valueClass="text-content-tertiary" display="null" />;
  }

  if (typeof value === "boolean") {
    return <LeafNode keyName={keyName} valueClass="text-purple-400" display={String(value)} />;
  }

  if (typeof value === "number") {
    return <LeafNode keyName={keyName} valueClass="text-status-active" display={String(value)} />;
  }

  if (typeof value === "string") {
    return <LeafNode keyName={keyName} valueClass="text-status-success" display={`"${value}"`} />;
  }

  if (Array.isArray(value)) {
    return (
      <CollapsibleNode
        keyName={keyName}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        bracketOpen="["
        bracketClose="]"
        childCount={value.length}
      >
        {value.map((item, i) => (
          <JsonNode key={i} value={item} depth={depth + 1} keyName={null} />
        ))}
      </CollapsibleNode>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <CollapsibleNode
        keyName={keyName}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        bracketOpen="{"
        bracketClose="}"
        childCount={entries.length}
      >
        {entries.map(([k, v]) => (
          <JsonNode key={k} value={v} depth={depth + 1} keyName={k} />
        ))}
      </CollapsibleNode>
    );
  }

  // Fallback for undefined or other types
  return <LeafNode keyName={keyName} valueClass="text-content-tertiary" display={String(value)} />;
}

interface LeafNodeProps {
  keyName: string | null;
  valueClass: string;
  display: string;
}

/** Renders a terminal (non-expandable) JSON value. */
function LeafNode({ keyName, valueClass, display }: LeafNodeProps) {
  return (
    <div className="leading-relaxed">
      {keyName !== null && (
        <span className="text-content-secondary">&quot;{keyName}&quot;: </span>
      )}
      <span className={valueClass}>{display}</span>
    </div>
  );
}

interface CollapsibleNodeProps {
  keyName: string | null;
  expanded: boolean;
  onToggle: () => void;
  bracketOpen: string;
  bracketClose: string;
  childCount: number;
  children: React.ReactNode;
}

/** Renders an expandable object or array node with toggle control. */
function CollapsibleNode({
  keyName,
  expanded,
  onToggle,
  bracketOpen,
  bracketClose,
  childCount,
  children,
}: CollapsibleNodeProps) {
  const toggle = expanded ? "\u25BC" : "\u25B6";

  return (
    <div className="leading-relaxed">
      <span
        onClick={onToggle}
        className="cursor-pointer select-none text-content-tertiary hover:text-accent"
      >
        {toggle}{" "}
      </span>
      {keyName !== null && (
        <span className="text-content-secondary">&quot;{keyName}&quot;: </span>
      )}
      <span className="text-content-tertiary">{bracketOpen}</span>
      {expanded ? (
        <>
          <div className="ml-4">{children}</div>
          <span className="text-content-tertiary">{bracketClose}</span>
        </>
      ) : (
        <span
          onClick={onToggle}
          className="cursor-pointer text-content-tertiary hover:text-content-secondary"
        >
          {" "}{childCount} item{childCount !== 1 ? "s" : ""}{" "}
          <span className="text-content-tertiary">{bracketClose}</span>
        </span>
      )}
    </div>
  );
}
