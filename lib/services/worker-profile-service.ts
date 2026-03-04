/**
 * Worker public profile service — read public profiles and manage offerings.
 */
import { COLLECTIONS } from "@/lib/constants";
import type {
  WorkerDocument,
  WorkerPublicProfile,
  WorkerOffering,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";

/**
 * Fetches a worker's public profile by slug.
 * Only returns fields safe for public display.
 *
 * @throws NotFoundError if no worker with this slug exists
 */
export async function getPublicProfileBySlug(
  slug: string,
): Promise<WorkerPublicProfile> {
  const db = await getDb();
  const worker = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOne({ slug });

  if (!worker || !worker.display_name) {
    throw new NotFoundError("Worker");
  }

  return toPublicProfile(worker);
}

/**
 * Updates a worker's public profile fields.
 * If slug is provided, checks uniqueness before updating.
 *
 * @throws ConflictError if slug is already taken by another worker
 * @throws NotFoundError if worker doesn't exist
 */
export async function updatePublicProfile(
  workerId: string,
  updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    slug?: string;
    offerings?: WorkerOffering[];
  },
): Promise<WorkerDocument> {
  const db = await getDb();
  const setFields: Record<string, unknown> = {};

  if (updates.slug) {
    await ensureSlugAvailable(updates.slug, workerId);
    setFields.slug = updates.slug;
  }
  if (updates.display_name !== undefined) {
    setFields.display_name = updates.display_name;
  }
  if (updates.bio !== undefined) {
    setFields.bio = updates.bio;
  }
  if (updates.avatar_url !== undefined) {
    setFields.avatar_url = updates.avatar_url;
  }
  if (updates.offerings !== undefined) {
    setFields.offerings = updates.offerings;
  }

  if (Object.keys(setFields).length === 0) {
    throw new ValidationError("No profile fields provided");
  }

  const worker = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOneAndUpdate(
      { _id: workerId },
      { $set: setFields },
      { returnDocument: "after" },
    );

  if (!worker) {
    throw new NotFoundError("Worker");
  }

  return worker;
}

/**
 * Lists all workers that have a public profile (slug + display_name set).
 * Returns only public-safe fields.
 */
export async function listPublicProfiles(): Promise<WorkerPublicProfile[]> {
  const db = await getDb();
  const workers = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .find({
      slug: { $ne: null },
      display_name: { $ne: null },
      $or: [{ status: "active" }, { status: { $exists: false } }],
    })
    .sort({ tasks_completed: -1 })
    .limit(50)
    .toArray();

  return workers.map(toPublicProfile);
}

/** Ensures a slug is not already taken by another worker. */
async function ensureSlugAvailable(
  slug: string,
  currentWorkerId: string,
): Promise<void> {
  const db = await getDb();
  const existing = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOne({ slug, _id: { $ne: currentWorkerId } });

  if (existing) {
    throw new ConflictError("Slug is already taken");
  }
}

/** Converts a worker document to a public-safe profile. */
function toPublicProfile(worker: WorkerDocument): WorkerPublicProfile {
  return {
    worker_id: worker._id,
    slug: worker.slug ?? "",
    display_name: worker.display_name ?? "",
    bio: worker.bio,
    avatar_url: worker.avatar_url,
    tier: worker.tier,
    status: worker.status ?? "active",
    tasks_completed: worker.tasks_completed,
    total_earned: worker.total_earned,
    offerings: worker.offerings ?? [],
  };
}
