/**
 * Infers a filename from a code block's language and content.
 * Checks for explicit filename annotations (e.g., `// filename: app.ts`)
 * before falling back to language-based defaults.
 */

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  rust: "rs",
  go: "go",
  html: "html",
  css: "css",
  sql: "sql",
  bash: "sh",
  shell: "sh",
  sh: "sh",
  json: "json",
  jsx: "jsx",
  tsx: "tsx",
  java: "java",
  kotlin: "kt",
  swift: "swift",
  ruby: "rb",
  php: "php",
  c: "c",
  cpp: "cpp",
  csharp: "cs",
  yaml: "yaml",
  yml: "yml",
  xml: "xml",
  markdown: "md",
  toml: "toml",
  dockerfile: "Dockerfile",
};

/** Pattern for explicit filename annotations in first 3 lines. */
const FILENAME_PATTERNS = [
  /\/\/\s*filename:\s*(.+)/i,
  /\/\/\s*file:\s*(.+)/i,
  /#\s*filename:\s*(.+)/i,
  /#\s*file:\s*(.+)/i,
  /\/\*\s*filename:\s*(.+?)\s*\*\//i,
  /<!--\s*filename:\s*(.+?)\s*-->/i,
];

/** Infers a filename from code language and content. Returns null if unknown. */
export function inferFilename(
  language: string,
  code: string,
): string | null {
  // Check first 3 lines for explicit filename annotation
  const firstLines = code.split("\n").slice(0, 3);
  for (const line of firstLines) {
    for (const pattern of FILENAME_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  // Fall back to language-based default
  const ext = LANGUAGE_EXTENSIONS[language.toLowerCase()];
  if (!ext) return null;

  return `code.${ext}`;
}
