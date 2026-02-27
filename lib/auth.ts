/**
 * Auth.js v5 configuration.
 * Uses AWS Cognito as the single OIDC provider (email+password + Google federated).
 * Exports handlers for API route + auth() for server-side session access.
 *
 * WHY lazy initialization: On Cloudflare Workers, process.env is only populated
 * at request time (via bindings), not at module load time. We must defer
 * NextAuth() initialization until the first request arrives.
 */
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Cognito from "next-auth/providers/cognito";
import { findOrCreateUser } from "@/lib/services/user-service";

function createAuth() {
  return NextAuth({
    providers: [
      Cognito({
        clientId: process.env.COGNITO_CLIENT_ID,
        clientSecret: process.env.COGNITO_CLIENT_SECRET,
        issuer: process.env.COGNITO_ISSUER,
      }),
    ],
    session: { strategy: "jwt" },
    pages: {
      signIn: "/login",
    },
    callbacks: {
      /**
       * On sign-in, find or create user in our database.
       * Cognito sub is stable across all login methods (email/password, Google).
       */
      async jwt({ token, account, profile }) {
        if (account && profile) {
          try {
            // WHY: Cognito sub is the same regardless of how the user signed in
            // (email+password or Google federation), so we use it as auth_id.
            const cognitoSub = profile.sub as string;
            const email = (profile.email as string) ?? null;
            const user = await findOrCreateUser("cognito", cognitoSub, email);
            token.userId = user._id;
            token.role = user.role;
          } catch (err) {
            // WHY: Auth.js swallows callback errors as generic "Server error".
            // Log the actual error so we can diagnose via wrangler tail / debug endpoint.
            console.error("[auth] jwt callback error:", err);
            throw err;
          }
        }
        return token;
      },

      /**
       * Expose our internal user ID and role on the session object.
       */
      session({ session, token }) {
        if (token.userId) {
          session.user.id = token.userId;
        }
        if (token.role) {
          session.user.role = token.role;
        }
        return session;
      },
    },
  });
}

// Lazy singleton — initialized on first request when env vars are available
let _instance: ReturnType<typeof NextAuth> | null = null;

function getInstance() {
  if (!_instance) {
    _instance = createAuth();
  }
  return _instance;
}

/** Auth.js route handlers for /api/auth/[...nextauth] */
export const handlers = {
  // WHY: cast needed because NextAuth expects NextRequest but the lazy
  // wrapper receives the generic Request from the route handler.
  GET: (req: unknown) => getInstance().handlers.GET(req as never),
  POST: (req: unknown) => getInstance().handlers.POST(req as never),
};

/** Server-side session getter */
export function auth() {
  return getInstance().auth();
}

/** Trigger sign-in redirect */
export function signIn(...args: Parameters<ReturnType<typeof NextAuth>["signIn"]>) {
  return getInstance().signIn(...args);
}

/** Trigger sign-out redirect */
export function signOut(...args: Parameters<ReturnType<typeof NextAuth>["signOut"]>) {
  return getInstance().signOut(...args);
}
