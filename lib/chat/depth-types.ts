/**
 * Task depth settings — controls output quality, length, and format.
 * The depth selector lets buyers specify how thorough they want the result,
 * which translates to system prompts and task constraints.
 */

/** Available depth levels. */
export type DepthLevel = "quick" | "standard" | "deep";

/** Output format preferences for deep mode. */
export type OutputFormat = "auto" | "report" | "list" | "step-by-step" | "essay";

/** Output length preferences for deep mode. */
export type OutputLength = "auto" | "medium" | "long" | "comprehensive";

/** Expanded options available when deep mode is selected. */
export interface DeepModeOptions {
  format: OutputFormat;
  length: OutputLength;
  /** Free-form custom instructions appended to the system prompt. */
  instructions: string;
}

/** Complete depth settings passed from UI to task submission. */
export interface DepthSettings {
  level: DepthLevel;
  deepOptions?: DeepModeOptions;
}

/** Static config for each depth level. */
interface DepthLevelConfig {
  label: string;
  description: string;
  minOutputLength: number;
  timeoutSeconds: number;
}

export const DEPTH_CONFIGS: Record<DepthLevel, DepthLevelConfig> = {
  quick: {
    label: "Quick",
    description: "Fast, concise answer",
    minOutputLength: 0,
    timeoutSeconds: 30,
  },
  standard: {
    label: "Standard",
    description: "Balanced depth and speed",
    minOutputLength: 300,
    timeoutSeconds: 60,
  },
  deep: {
    label: "Deep",
    description: "Thorough, comprehensive analysis",
    minOutputLength: 1500,
    timeoutSeconds: 300,
  },
};

export const FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "report", label: "Report" },
  { value: "list", label: "Bullet List" },
  { value: "step-by-step", label: "Step-by-Step" },
  { value: "essay", label: "Essay / Prose" },
];

export const LENGTH_OPTIONS: Array<{ value: OutputLength; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "medium", label: "Medium (~500 words)" },
  { value: "long", label: "Long (~1500 words)" },
  { value: "comprehensive", label: "Comprehensive (3000+ words)" },
];

/** Default depth settings — deep mode with auto options. */
export const DEFAULT_DEPTH_SETTINGS: DepthSettings = {
  level: "deep",
  deepOptions: { format: "auto", length: "auto", instructions: "" },
};

/** Default deep mode options (used when switching to deep). */
export const DEFAULT_DEEP_OPTIONS: DeepModeOptions = {
  format: "auto",
  length: "auto",
  instructions: "",
};

/**
 * Builds a system prompt string from depth settings.
 * Returns null for quick mode (no system prompt injection).
 */
export function buildDepthSystemPrompt(settings: DepthSettings): string | null {
  if (settings.level === "quick") return null;

  if (settings.level === "standard") {
    return "Provide a clear, well-organized response with adequate detail. Use headings and structure where appropriate.";
  }

  // Deep mode — build detailed system prompt
  const parts: string[] = [
    "You are completing a premium deep-analysis task. The user expects a thorough, comprehensive, and well-structured response.",
    "Take your time to think deeply. Cover all relevant angles, provide evidence and examples, and organize your output clearly.",
  ];

  const opts = settings.deepOptions;
  if (opts) {
    if (opts.format !== "auto") {
      const formatInstructions: Record<string, string> = {
        report: "Structure your output as a professional report with executive summary, sections, and conclusion.",
        list: "Organize your output as a detailed bullet-point list with clear categories and sub-points.",
        "step-by-step": "Present your output as a numbered step-by-step guide with detailed explanations for each step.",
        essay: "Write your output as a flowing essay with introduction, body paragraphs, and conclusion.",
      };
      parts.push(formatInstructions[opts.format] ?? "");
    }

    if (opts.length !== "auto") {
      const lengthInstructions: Record<string, string> = {
        medium: "Target approximately 500 words of substantive content.",
        long: "Target approximately 1500 words of substantive content.",
        comprehensive: "Provide an exhaustive analysis of at least 3000 words covering all dimensions of the topic.",
      };
      parts.push(lengthInstructions[opts.length] ?? "");
    }

    if (opts.instructions.trim()) {
      parts.push(`Additional instructions: ${opts.instructions.trim()}`);
    }
  }

  return parts.filter(Boolean).join("\n\n");
}
