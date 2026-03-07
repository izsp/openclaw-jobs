"use client";

import { useState } from "react";
import type {
  DepthLevel,
  DepthSettings,
  DeepModeOptions,
  OutputFormat,
  OutputLength,
} from "@/lib/chat/depth-types";
import {
  DEPTH_CONFIGS,
  FORMAT_OPTIONS,
  LENGTH_OPTIONS,
  DEFAULT_DEEP_OPTIONS,
} from "@/lib/chat/depth-types";

interface DepthSelectorProps {
  settings: DepthSettings;
  onChange: (settings: DepthSettings) => void;
  disabled?: boolean;
}

const LEVELS: DepthLevel[] = ["quick", "standard", "deep"];

const LEVEL_ICONS: Record<DepthLevel, string> = {
  quick: "~",
  standard: "=",
  deep: ">>",
};

export function DepthSelector({ settings, onChange, disabled }: DepthSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  function handleLevelChange(level: DepthLevel) {
    if (disabled) return;
    const next: DepthSettings = { level };
    if (level === "deep") {
      next.deepOptions = settings.deepOptions ?? { ...DEFAULT_DEEP_OPTIONS };
    }
    onChange(next);
  }

  function handleDeepOptionChange(patch: Partial<DeepModeOptions>) {
    const current = settings.deepOptions ?? { ...DEFAULT_DEEP_OPTIONS };
    onChange({
      level: "deep",
      deepOptions: { ...current, ...patch },
    });
  }

  const isDeep = settings.level === "deep";

  return (
    <div className="space-y-1.5">
      {/* Level pills */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-zinc-600">
          Depth
        </span>
        {LEVELS.map((level) => {
          const config = DEPTH_CONFIGS[level];
          const active = settings.level === level;
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => handleLevelChange(level)}
              title={config.description}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? level === "deep"
                    ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40"
                    : level === "standard"
                      ? "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30"
                      : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              } disabled:opacity-40`}
            >
              <span className="mr-0.5 font-mono text-[10px]">{LEVEL_ICONS[level]}</span>
              {config.label}
            </button>
          );
        })}

        {/* Expand toggle for deep mode options */}
        {isDeep && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setExpanded((v) => !v)}
            className="ml-1.5 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-orange-400 disabled:opacity-40"
          >
            {expanded ? "- options" : "+ options"}
          </button>
        )}
      </div>

      {/* Expanded deep mode options */}
      {isDeep && expanded && (
        <DeepOptions
          options={settings.deepOptions ?? DEFAULT_DEEP_OPTIONS}
          onChange={handleDeepOptionChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

interface DeepOptionsProps {
  options: DeepModeOptions;
  onChange: (patch: Partial<DeepModeOptions>) => void;
  disabled?: boolean;
}

function DeepOptions({ options, onChange, disabled }: DeepOptionsProps) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-3">
      <div className="flex items-center gap-3">
        {/* Format */}
        <OptionGroup label="Format">
          <select
            value={options.format}
            onChange={(e) => onChange({ format: e.target.value as OutputFormat })}
            disabled={disabled}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 outline-none focus:border-orange-500 disabled:opacity-40 sm:py-0.5"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </OptionGroup>

        {/* Length */}
        <OptionGroup label="Length">
          <select
            value={options.length}
            onChange={(e) => onChange({ length: e.target.value as OutputLength })}
            disabled={disabled}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 outline-none focus:border-orange-500 disabled:opacity-40 sm:py-0.5"
          >
            {LENGTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </OptionGroup>
      </div>

      {/* Custom instructions — full width on mobile */}
      <OptionGroup label="Instructions" grow>
        <input
          type="text"
          value={options.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          disabled={disabled}
          placeholder="e.g. Include data sources, use formal tone..."
          maxLength={200}
          className="w-full min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-orange-500 disabled:opacity-40 sm:w-64 sm:flex-none sm:py-0.5"
        />
      </OptionGroup>
    </div>
  );
}

function OptionGroup({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${grow ? "min-w-0 flex-1" : ""}`}>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
      {children}
    </div>
  );
}
