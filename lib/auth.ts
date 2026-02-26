/**
 * Auth.js v5 configuration.
 * Exports handlers for API route + auth() for server-side session access.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { findOrCreateUser } from "@/lib/services/user-service";
import type { AuthProvider } from "@/lib/types";

/**
 * Maps Auth.js provider IDs to our AuthProvider type.
 */
function toAuthProvider(providerId: string): AuthProvider {
  if (providerId === "google") return "google";
  if (providerId === "github") return "github";
  return "email";
}

/**
 * Dev-only Credentials provider for quick local testing.
 * Accepts any email — no password required.
 * Only included when NODE_ENV !== "production".
 */
function devCredentialsProvider() {
  if (process.env.NODE_ENV === "production") return [];
  return [
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@openclaw.jobs" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        if (!email || typeof email !== "string") return null;
        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  ];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    ...devCredentialsProvider(),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * On sign-in, find or create user in our database.
     * Attach our internal user ID to the JWT token.
     */
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const provider = toAuthProvider(account.provider);
        const authId = account.providerAccountId;
        const email = profile.email ?? null;

        const user = await findOrCreateUser(provider, authId, email);
        token.userId = user._id;
        token.role = user.role;
      }

      // Dev credentials: profile is null, create user from token info
      if (account?.provider === "dev-login" && !token.userId) {
        const email = token.email ?? "dev@openclaw.jobs";
        const user = await findOrCreateUser("email", email, email);
        token.userId = user._id;
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
