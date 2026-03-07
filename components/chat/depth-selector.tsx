"use client";

import { useState, useRef, useEffect } from "react";
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

const LEVEL_COLORS: Record<DepthLevel, string> = {
  quick: "text-emerald-600",
  standard: "text-sky-600",
  deep: "text-accent",
};

/**
 * Compact depth selector — shows current level as a small button.
 * Clicking opens a popover with level choices and deep mode options.
 */
export function DepthSelector({ settings, onChange, disabled }: DepthSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

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

  const config = DEPTH_CONFIGS[settings.level];
  const isDeep = settings.level === "deep";

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors hover:bg-surface-alt disabled:opacity-40 ${LEVEL_COLORS[settings.level]}`}
      >
        <DepthIcon level={settings.level} />
        {config.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-1.5 w-64 rounded-xl border border-edge bg-surface shadow-lg">
          {/* Level options */}
          <div className="border-b border-edge p-2">
            {LEVELS.map((level) => {
              const c = DEPTH_CONFIGS[level];
              const active = settings.level === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleLevelChange(level)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    active ? "bg-surface-alt" : "hover:bg-surface-alt/50"
                  }`}
                >
                  <DepthIcon level={level} />
                  <div>
                    <span className={`text-xs font-medium ${active ? LEVEL_COLORS[level] : "text-content"}`}>
                      {c.label}
                    </span>
                    <p className="text-[10px] text-content-tertiary">{c.description}</p>
                  </div>
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`ml-auto ${LEVEL_COLORS[level]}`}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Deep mode options */}
          {isDeep && (
            <div className="space-y-2 p-3">
              <div className="flex items-center gap-2">
                <OptionSelect
                  label="Format"
                  value={settings.deepOptions?.format ?? "auto"}
                  options={FORMAT_OPTIONS}
                  onChange={(v) => handleDeepOptionChange({ format: v as OutputFormat })}
                  disabled={disabled}
                />
                <OptionSelect
                  label="Length"
                  value={settings.deepOptions?.length ?? "auto"}
                  options={LENGTH_OPTIONS}
                  onChange={(v) => handleDeepOptionChange({ length: v as OutputLength })}
                  disabled={disabled}
                />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-content-tertiary">Instructions</span>
                <input
                  type="text"
                  value={settings.deepOptions?.instructions ?? ""}
                  onChange={(e) => handleDeepOptionChange({ instructions: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. Use formal tone..."
                  maxLength={200}
                  className="mt-0.5 w-full rounded-lg border border-edge bg-page px-2 py-1.5 text-[11px] text-content placeholder-content-tertiary outline-none focus:border-input-focus disabled:opacity-40"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DepthIcon({ level }: { level: DepthLevel }) {
  const bars = level === "quick" ? 1 : level === "standard" ? 2 : 3;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className={LEVEL_COLORS[level]}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={i * 4 + 1}
          y={10 - (i + 1) * 3}
          width="3"
          height={(i + 1) * 3}
          rx="0.5"
          fill={i < bars ? "currentColor" : "currentColor"}
          opacity={i < bars ? 1 : 0.2}
        />
      ))}
    </svg>
  );
}

function OptionSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex-1">
      <span className="text-[10px] uppercase tracking-wider text-content-tertiary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-0.5 w-full rounded-lg border border-edge bg-page px-2 py-1.5 text-[11px] text-content-secondary outline-none focus:border-input-focus disabled:opacity-40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
