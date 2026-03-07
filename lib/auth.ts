/**
 * Auth.js v5 configuration.
 * Supports two sign-in paths:
 *   1. Cognito OIDC (Hosted UI — Google federation)
 *   2. Credentials (email + password → Cognito InitiateAuth API)
 */
import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";
import Credentials from "next-auth/providers/credentials";
import { findOrCreateUser } from "@/lib/services/user-service";
import { authenticateUser } from "@/lib/services/cognito-service";

/** Cross-subdomain cookie config for .openclaw.jobs */
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN ?? undefined;

const { handlers, auth, signIn, signOut } = NextAuth({
  cookies: {
    sessionToken: {
      name: cookieDomain
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: !!cookieDomain,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      },
    },
  },
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET,
      issuer: process.env.COGNITO_ISSUER,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;
        if (!email || !password) return null;

        const result = await authenticateUser(email, password);
        const user = await findOrCreateUser("cognito", result.sub, result.email);
        return { id: user._id, email: user.email, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  logger: {
    error(code, ...message) {
      console.error("[auth-error]", code, JSON.stringify(message));
    },
    warn(code) {
      console.warn("[auth-warn]", code);
    },
  },
  callbacks: {
    /**
     * On sign-in, find or create user in our database.
     * Handles both OIDC (Cognito provider) and Credentials paths.
     */
    async jwt({ token, account, profile, user }) {
      // Path 1: Cognito OIDC (Google federation via Hosted UI)
      if (account?.provider === "cognito" && profile) {
        const cognitoSub = profile.sub as string;
        const email = (profile.email as string) ?? null;
        const dbUser = await findOrCreateUser("cognito", cognitoSub, email);
        token.userId = dbUser._id;
        token.role = dbUser.role;
      }

      // Path 2: Credentials (email + password)
      if (account?.provider === "credentials" && user) {
        token.userId = user.id;
        token.role = user.role;
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

export { handlers, auth, signIn, signOut };
