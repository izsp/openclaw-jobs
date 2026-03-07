/**
 * Hook that memoizes artifact parsing for a markdown result.
 * Prevents re-parsing on every render.
 */

import { useMemo } from "react";
import { parseArtifacts } from "@/lib/chat/parse-artifacts";
import type { ParsedResult } from "@/lib/chat/artifact-types";

/** Returns parsed artifacts and summary for the given markdown content. */
export function useParsedResult(content: string): ParsedResult {
  return useMemo(() => parseArtifacts(content), [content]);
}
