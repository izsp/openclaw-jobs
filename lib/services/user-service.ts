/**
 * User service — handles user creation and lookup.
 * Called by Auth.js callbacks on sign-in.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type { AuthProvider, UserDocument, UserRole } from "@/lib/types";
import { getDb } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { NotFoundError } from "@/lib/errors";
import { initializeBalance } from "./balance-service";

/**
 * Creates a new user or returns the existing one.
 * Used during OAuth sign-in to ensure a user document exists.
 *
 * @param authProvider - OAuth provider (google, github, email)
 * @param authId - Provider-specific user ID
 * @param email - User email (may be null for anonymous)
 * @returns The user document (existing or newly created)
 */
export async function findOrCreateUser(
  authProvider: AuthProvider,
  authId: string,
  email: string | null,
): Promise<UserDocument> {
  const db = await getDb();
  const collection = db.collection<UserDocument>(COLLECTIONS.USER);

  const existing = await collection.findOne({
    auth_provider: authProvider,
    auth_id: authId,
  });

  if (existing) {
    return existing;
  }

  const user: UserDocument = {
    _id: nanoid(),
    email,
    auth_provider: authProvider,
    auth_id: authId,
    role: "buyer" as UserRole,
    created_at: new Date(),
  };

  await collection.insertOne(user);

  // Initialize balance with signup bonus from config
  const signupConfig = await getConfig("signup");
  const bonusCents = signupConfig?.buyer_free_credit_cents ?? 0;
  await initializeBalance(user._id, bonusCents);

  return user;
}

/**
 * Looks up a user by their internal ID.
 *
 * @throws NotFoundError if no user with this ID exists
 */
export async function getUserById(userId: string): Promise<UserDocument> {
  const db = await getDb();
  const user = await db
    .collection<UserDocument>(COLLECTIONS.USER)
    .findOne({ _id: userId });

  if (!user) {
    throw new NotFoundError("User");
  }

  return user;
}

/**
 * Looks up a user by email address.
 * Returns null if no user found (does not throw).
 */
export async function findUserByEmail(
  email: string,
): Promise<UserDocument | null> {
  const db = await getDb();
  return db
    .collection<UserDocument>(COLLECTIONS.USER)
    .findOne({ email });
}
