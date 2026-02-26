/**
 * Extends Auth.js default types with our custom session fields.
 */
import type { UserRole } from "@/lib/types/user.types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
  }
}
