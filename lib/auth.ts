/**
 * Auth.js v5 configuration.
 * Uses AWS Cognito as the single OIDC provider (email+password + Google federated).
 * Exports handlers for API route + auth() for server-side session access.
 *
 * WHY fully dynamic imports: On Cloudflare Workers (OpenNext), ALL route modules
 * are bundled into a single worker.js. Any top-level `import` of next-auth causes
 * the Worker to hang during module initialization — even for routes that don't
 * use auth. By using `await import()` inside each function, next-auth is only
 * loaded when actually needed (e.g. when /api/auth/* or requireAuth() is called).
 */

// WHY: We need the NextAuth return type for the singleton, but importing the
// module itself at the top level causes Workers to hang. Use a type-only import
// for the type, and dynamic import for the runtime value.
import type NextAuthType from "next-auth";

type NextAuthInstance = ReturnType<typeof NextAuthType>;

// Lazy singleton — initialized on first auth request
let _instance: NextAuthInstance | null = null;

async function getInstance(): Promise<NextAuthInstance> {
  if (_instance) return _instance;

  const [{ default: NextAuth }, { default: Cognito }, { findOrCreateUser }] =
    await Promise.all([
      import("next-auth"),
      import("next-auth/providers/cognito"),
      import("@/lib/services/user-service"),
    ]);

  _instance = NextAuth({
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
    // WHY: Auth.js swallows errors as generic "Configuration" or "Server error".
    // Custom logger exposes the actual error for debugging on Workers.
    logger: {
      error(code, ...message) {
        console.error("[auth-error]", code, JSON.stringify(message));
      },
      warn(code) {
        console.warn("[auth-warn]", code);
      },
      debug(code, ...message) {
        console.debug("[auth-debug]", code, JSON.stringify(message));
      },
    },
    debug: true,
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

  return _instance;
}

/** Auth.js route handlers for /api/auth/[...nextauth] */
// WHY pass-through args: Next.js App Router passes (req, { params }) to catch-all
// route handlers. Auth.js v5 needs the params to determine the action (signin,
// callback, session, etc.). Dropping the context caused `error=Configuration`.
export const handlers = {
  GET: async (...args: unknown[]) => {
    try {
      const instance = await getInstance();
      const response = await (instance.handlers.GET as (...a: unknown[]) => Promise<Response>)(
        ...args,
      );
      // Log redirects to error page for debugging
      if (response.status === 302) {
        const location = response.headers.get("location") ?? "";
        if (location.includes("error=")) {
          console.error("[auth-handler] GET redirect to error:", location);
        }
      }
      return response;
    } catch (err) {
      console.error("[auth-handler] GET threw:", err);
      throw err;
    }
  },
  POST: async (...args: unknown[]) => {
    try {
      const instance = await getInstance();
      return await (instance.handlers.POST as (...a: unknown[]) => Promise<Response>)(
        ...args,
      );
    } catch (err) {
      console.error("[auth-handler] POST threw:", err);
      throw err;
    }
  },
};

/** Server-side session getter */
export async function auth() {
  const instance = await getInstance();
  return instance.auth();
}

/** Trigger sign-in redirect */
export async function signIn(
  ...args: Parameters<NextAuthInstance["signIn"]>
) {
  const instance = await getInstance();
  return instance.signIn(...args);
}

/** Trigger sign-out redirect */
export async function signOut(
  ...args: Parameters<NextAuthInstance["signOut"]>
) {
  const instance = await getInstance();
  return instance.signOut(...args);
}
