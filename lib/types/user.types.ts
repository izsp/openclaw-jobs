import type {
  AUTH_PROVIDERS,
  USER_ROLES,
} from "@/lib/constants";

/** Auth provider literal type derived from constants. */
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** User role literal type derived from constants. */
export type UserRole = (typeof USER_ROLES)[number];

/** MongoDB document shape for the `user` collection. */
export interface UserDocument {
  _id: string;
  email: string | null;
  auth_provider: AuthProvider;
  auth_id: string;
  role: UserRole;
  created_at: Date;
}
