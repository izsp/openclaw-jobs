/**
 * Auth.js v5 configuration.
 * Uses AWS Cognito as the single OIDC provider (email+password + Google federated).
 * Exports handlers for API route + auth() for server-side session access.
 */
import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";
import { findOrCreateUser } from "@/lib/services/user-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        // WHY: Cognito sub is the same regardless of how the user signed in
        // (email+password or Google federation), so we use it as auth_id.
        const cognitoSub = profile.sub as string; // Cognito always provides sub
        const email = (profile.email as string) ?? null;
        const user = await findOrCreateUser("cognito", cognitoSub, email);
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
