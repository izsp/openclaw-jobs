"use client";

import { adminGet, adminPut } from "./admin-fetch";
import type { ConfigKey, PlatformConfigDocument } from "@/lib/types/config.types";

/** Get a platform config by key. */
export function getConfig(key: ConfigKey): Promise<PlatformConfigDocument> {
  return adminGet(`/api/admin/config/${encodeURIComponent(key)}`);
}

/** Update a platform config by key. */
export function updateConfig(
  key: ConfigKey,
  data: Record<string, unknown>,
): Promise<PlatformConfigDocument> {
  return adminPut(`/api/admin/config/${encodeURIComponent(key)}`, data);
}
