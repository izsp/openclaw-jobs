/**
 * Looks up minimal display info for a worker (name + avatar).
 * Used when returning completed task results to buyers.
 */
import { getDb } from "@/lib/db";
import { COLLECTIONS } from "@/lib/constants";
import type { WorkerDocument } from "@/lib/types/worker.types";

interface WorkerDisplayInfo {
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Returns display_name and avatar_url for a worker, or null if not found.
 * Only projects the two fields needed — no full document load.
 */
export async function lookupWorkerDisplay(
  workerId: string,
): Promise<WorkerDisplayInfo | null> {
  const db = await getDb();
  const worker = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOne(
      { _id: workerId },
      { projection: { display_name: 1, avatar_url: 1 } },
    );

  if (!worker) return null;

  return {
    display_name: worker.display_name ?? null,
    avatar_url: worker.avatar_url ?? null,
  };
}
