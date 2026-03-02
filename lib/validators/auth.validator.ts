/**
 * Zod schemas for auth-related API input validation.
 */
import { z } from "zod";

const emailField = z.string().email("Invalid email address").max(256);

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

/** POST /api/auth/cognito/register */
export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
});

/** POST /api/auth/cognito/verify */
export const verifySchema = z.object({
  email: emailField,
  code: z.string().length(6, "Verification code must be 6 digits"),
});

/** POST /api/auth/cognito/forgot-password */
export const forgotPasswordSchema = z.object({
  email: emailField,
});

/** POST /api/auth/cognito/reset-password */
export const resetPasswordSchema = z.object({
  email: emailField,
  code: z.string().length(6, "Verification code must be 6 digits"),
  newPassword: passwordField,
});

/** POST /api/auth/cognito/resend-code */
export const resendCodeSchema = z.object({
  email: emailField,
});
