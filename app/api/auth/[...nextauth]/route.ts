/**
 * Auth.js v5 catch-all route handler.
 * Handles /api/auth/signin, /api/auth/callback, /api/auth/signout, etc.
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
