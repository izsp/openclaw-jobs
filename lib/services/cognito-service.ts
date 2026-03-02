/**
 * Cognito API service — direct HTTP calls, no AWS SDK.
 * Uses the Cognito public JSON API via fetch().
 */
import { createHmac } from "crypto";
import type { CognitoAuthResult, CognitoApiError } from "@/lib/types/cognito.types";
import { AuthError, ValidationError } from "@/lib/errors";

const COGNITO_ENDPOINT = "https://cognito-idp.us-west-2.amazonaws.com/";

/** Map Cognito error codes to user-friendly messages. */
const ERROR_MAP: Record<string, string> = {
  NotAuthorizedException: "Incorrect email or password",
  UserNotFoundException: "Incorrect email or password",
  UsernameExistsException: "This email is already registered",
  CodeMismatchException: "Invalid verification code",
  ExpiredCodeException: "Verification code has expired",
  InvalidPasswordException:
    "Password must be at least 8 characters with letters and numbers",
  LimitExceededException: "Too many requests, please try again later",
};

/** Special error code that signals the email is not yet verified. */
const USER_NOT_CONFIRMED = "UserNotConfirmedException";

/**
 * Compute the SECRET_HASH required when the Cognito app client has a secret.
 * HMAC-SHA256(username, clientSecret) → base64.
 */
function computeSecretHash(username: string): string {
  const clientSecret = process.env.COGNITO_CLIENT_SECRET!;
  const clientId = process.env.COGNITO_CLIENT_ID!;
  return createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64");
}

/**
 * Low-level call to the Cognito JSON API.
 * @throws AuthError or ValidationError with user-friendly message
 */
async function callCognito(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json()) as CognitoApiError;
    const errorCode = body.__type?.split("#").pop() ?? "UnknownError";

    if (errorCode === USER_NOT_CONFIRMED) {
      const err = new ValidationError("Email not verified");
      (err as ValidationError & { cognitoCode: string }).cognitoCode = USER_NOT_CONFIRMED;
      throw err;
    }

    const message = ERROR_MAP[errorCode] ?? "Authentication service error";
    if (errorCode === "NotAuthorizedException" || errorCode === "UserNotFoundException") {
      throw new AuthError(message);
    }
    throw new ValidationError(message);
  }

  return res.json();
}

/**
 * Decode a JWT payload without signature verification.
 * We trust the token because it comes directly from Cognito over HTTPS.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString());
}

/**
 * Authenticate a user with email + password.
 * @returns sub, email, and tokens from Cognito
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<CognitoAuthResult> {
  const result = await callCognito("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      SECRET_HASH: computeSecretHash(email),
    },
  }) as { AuthenticationResult: { IdToken: string; AccessToken: string } };

  const idPayload = decodeJwtPayload(result.AuthenticationResult.IdToken);

  return {
    sub: idPayload.sub as string,
    email: (idPayload.email as string) ?? email,
    idToken: result.AuthenticationResult.IdToken,
    accessToken: result.AuthenticationResult.AccessToken,
  };
}

/**
 * Register a new user with email + password.
 * @returns the Cognito user sub (UUID)
 */
export async function signUpUser(
  email: string,
  password: string,
): Promise<{ userSub: string }> {
  const result = await callCognito("SignUp", {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    Password: password,
    SecretHash: computeSecretHash(email),
    UserAttributes: [{ Name: "email", Value: email }],
  }) as { UserSub: string };

  return { userSub: result.UserSub };
}

/**
 * Confirm a user's email with the verification code.
 */
export async function confirmSignUp(email: string, code: string): Promise<void> {
  await callCognito("ConfirmSignUp", {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    SecretHash: computeSecretHash(email),
  });
}

/**
 * Resend the email verification code.
 */
export async function resendConfirmationCode(email: string): Promise<void> {
  await callCognito("ResendConfirmationCode", {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    SecretHash: computeSecretHash(email),
  });
}

/**
 * Initiate the forgot-password flow (sends a verification code).
 */
export async function forgotPassword(email: string): Promise<void> {
  await callCognito("ForgotPassword", {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    SecretHash: computeSecretHash(email),
  });
}

/**
 * Complete the forgot-password flow with code + new password.
 */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await callCognito("ConfirmForgotPassword", {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
    SecretHash: computeSecretHash(email),
  });
}
