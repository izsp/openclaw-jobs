"use client";

const STORAGE_KEY = "admin_token";

/** Read admin token from sessionStorage. */
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

/** Save admin token to sessionStorage. */
export function setAdminToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

/** Remove admin token from sessionStorage. */
export function clearAdminToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Fetch wrapper that attaches admin Bearer token.
 * Clears token and throws on 401.
 */
export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Session expired");
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data as T;
}

/** GET with optional query params. Strips undefined/empty values. */
export function adminGet<T = unknown>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  if (params) {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") clean[k] = v;
    }
    const qs = new URLSearchParams(clean).toString();
    return adminFetch<T>(qs ? `${path}?${qs}` : path);
  }
  return adminFetch<T>(path);
}

/** POST with JSON body. */
export function adminPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  return adminFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

/** PATCH with JSON body. */
export function adminPatch<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  return adminFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

/** PUT with JSON body. */
export function adminPut<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  return adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
}
