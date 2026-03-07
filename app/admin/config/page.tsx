"use client";

import { useState } from "react";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { getConfig, updateConfig } from "@/lib/api/admin/admin-config-client";
import { ConfigEditor } from "@/components/admin/config-editor";
import { CONFIG_KEYS } from "@/lib/constants";
import type { ConfigKey, PlatformConfigDocument } from "@/lib/types/config.types";

const CONFIG_DESCRIPTIONS: Record<string, string> = {
  pricing: "Task pricing rules (base, per-type)",
  tiers: "Worker tier thresholds & limits",
  commissions: "Platform commission rates",
  signup: "Signup requirements & invite codes",
  qa: "QA injection rates & thresholds",
  rate_limits: "API rate limit settings",
  review: "Supervisor review settings",
};

export default function AdminConfigPage() {
  const [activeKey, setActiveKey] = useState<ConfigKey | null>(null);

  const { data, loading, error, refetch } = useAdminData<PlatformConfigDocument | null>(
    () => (activeKey ? getConfig(activeKey) : Promise.resolve(null)),
    [activeKey],
  );

  async function handleSave(parsed: Record<string, unknown>) {
    if (!activeKey) return;
    await updateConfig(activeKey, parsed);
    refetch();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Platform Config</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CONFIG_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveKey(key)}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              activeKey === key
                ? "border-orange-500 bg-zinc-800 text-orange-500"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <span className="text-sm font-medium">{key}</span>
            <p className="mt-1 text-xs text-zinc-500">
              {CONFIG_DESCRIPTIONS[key] ?? "Click to edit"}
            </p>
          </button>
        ))}
      </div>

      {!activeKey && (
        <p className="text-sm text-zinc-500">Select a config key above to view and edit.</p>
      )}

      {activeKey && loading && (
        <p className="animate-pulse text-zinc-500">Loading config...</p>
      )}

      {error && <p className="text-red-400">{error}</p>}

      {activeKey && data && !loading && (
        <ConfigEditor
          configKey={activeKey}
          data={data as unknown as Record<string, unknown>}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
