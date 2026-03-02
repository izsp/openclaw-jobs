/**
 * Types for direct Cognito API interactions (no AWS SDK).
 */

/** Successful authentication result from Cognito InitiateAuth. */
export interface CognitoAuthResult {
  sub: string;
  email: string;
  idToken: string;
  accessToken: string;
}

/** Error shape returned by the Cognito JSON API. */
export interface CognitoApiError {
  __type: string;
  message: string;
}
