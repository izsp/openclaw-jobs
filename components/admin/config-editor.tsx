"use client";

import { useState } from "react";

interface ConfigEditorProps {
  configKey: string;
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function ConfigEditor({ configKey, data, onSave }: ConfigEditorProps) {
  const [text, setText] = useState(JSON.stringify(data, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Invalid JSON");
      return;
    }
    setLoading(true);
    try {
      await onSave(parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-2 text-sm font-medium text-zinc-200">{configKey}</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-orange-500 focus:outline-none"
        rows={12}
      />
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      {saved && <p className="mb-2 text-sm text-green-400">Saved</p>}
      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
