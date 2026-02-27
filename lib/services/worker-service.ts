/**
 * Worker service — registration, authentication, and profile updates.
 * Workers authenticate via Bearer token (SHA-256 hashed for storage).
 */
import { nanoid } from "nanoid";
import { COLLECTIONS, ID_PREFIX } from "@/lib/constants";
import type {
  WorkerDocument,
  WorkerModelInfo,
  WorkerProfile,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { AuthError, NotFoundError, ValidationError } from "@/lib/errors";
import { generateWorkerToken, hashToken } from "@/lib/hash-token";

/** Default profile for newly registered workers. */
const DEFAULT_PROFILE: WorkerProfile = {
  preferences: {
    accept: [],
    reject: [],
    languages: [],
    max_tokens: 0,
    min_price: 0,
  },
  schedule: { timezone: "UTC", shifts: [] },
  limits: { daily_max_tasks: 100, concurrent: 1 },
};

interface RegisterResult {
  workerId: string;
  token: string;
  worker: WorkerDocument;
}

/**
 * Registers a new worker. Generates a unique ID and auth token.
 * The raw token is returned ONCE — only the hash is stored.
 *
 * @param workerType - Self-reported worker type (e.g. "gpt4", "claude")
 * @param modelInfo - Optional model info (provider, model, capabilities)
 * @returns Worker ID, raw token (show once), and full worker document
 */
export async function registerWorker(
  workerType: string,
  modelInfo: WorkerModelInfo | null,
): Promise<RegisterResult> {
  const workerId = `${ID_PREFIX.WORKER}${nanoid()}`;
  const token = generateWorkerToken();
  const tokenHash = hashToken(token);
  const now = new Date();

  const worker: WorkerDocument = {
    _id: workerId,
    token_hash: tokenHash,
    worker_type: workerType,
    model_info: modelInfo,
    email: null,
    payout: null,
    profile: DEFAULT_PROFILE,
    tier: "new",
    tasks_claimed: 0,
    tasks_completed: 0,
    tasks_expired: 0,
    consecutive_expires: 0,
    total_earned: 0,
    credit_requests: 0,
    spot_pass: 0,
    spot_fail: 0,
    difficulty_score: 0,
    avg_response_ms: null,
    suspended_until: null,
    created_at: now,
    last_seen: null,
  };

  const db = await getDb();
  await db.collection<WorkerDocument>(COLLECTIONS.WORKER).insertOne(worker);

  return { workerId, token, worker };
}

/**
 * Authenticates a worker by raw Bearer token.
 * Hashes the token and looks up the worker document.
 * Updates last_seen timestamp on each authentication.
 *
 * @param rawToken - The raw Bearer token from the Authorization header
 * @returns The authenticated worker document
 * @throws AuthError if token is invalid or worker not found
 */
export async function authenticateWorker(
  rawToken: string,
): Promise<WorkerDocument> {
  const tokenHash = hashToken(rawToken);
  const db = await getDb();

  const worker = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOneAndUpdate(
      { token_hash: tokenHash },
      { $set: { last_seen: new Date() } },
      { returnDocument: "after" },
    );

  if (!worker) {
    throw new AuthError("Invalid worker token");
  }

  return worker;
}

/**
 * Updates a worker's profile (preferences, schedule, limits).
 * Only provided fields are updated — omitted fields remain unchanged.
 *
 * @returns The updated worker document
 * @throws NotFoundError if worker doesn't exist
 */
export async function updateWorkerProfile(
  workerId: string,
  updates: Partial<WorkerProfile>,
): Promise<WorkerDocument> {
  const db = await getDb();
  const setFields: Record<string, unknown> = {};

  if (updates.preferences) {
    for (const [key, value] of Object.entries(updates.preferences)) {
      if (value !== undefined) {
        setFields[`profile.preferences.${key}`] = value;
      }
    }
  }
  if (updates.schedule) {
    for (const [key, value] of Object.entries(updates.schedule)) {
      if (value !== undefined) {
        setFields[`profile.schedule.${key}`] = value;
      }
    }
  }
  if (updates.limits) {
    for (const [key, value] of Object.entries(updates.limits)) {
      if (value !== undefined) {
        setFields[`profile.limits.${key}`] = value;
      }
    }
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
