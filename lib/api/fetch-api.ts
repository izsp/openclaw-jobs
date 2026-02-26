/**
 * Shared fetch wrapper for frontend API calls.
 * Handles JSON parsing, error extraction, and type safety.
 */
import type { ApiResponse } from "@/lib/types/api.types";

/** Error thrown when an API call fails. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Typed fetch wrapper that calls our API and unwraps the response.
 * @throws ApiError if the response indicates failure
 */
export async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const { headers: customHeaders, ...restOptions } = options ?? {};
  const response = await fetch(path, {
    ...restOptions,
    headers: { "Content-Type": "application/json", ...customHeaders },
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success || !response.ok) {
    throw new ApiError(
      json.error ?? "Request failed",
      json.code ?? "UNKNOWN_ERROR",
      response.status,
    );
  }

  return json.data as T;
}
