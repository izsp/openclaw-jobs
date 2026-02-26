import { HTTP_STATUS } from "@/lib/constants";

/**
 * Base application error. All custom errors extend this.
 * Carries an HTTP status code and a machine-readable error code.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** Input validation failed (Zod or manual check). */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.BAD_REQUEST, "VALIDATION_ERROR");
  }
}

/** Authentication failed — missing or invalid token/session. */
export class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super(message, HTTP_STATUS.UNAUTHORIZED, "AUTH_ERROR");
  }
}

/** Authorization failed — authenticated but not allowed. */
export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, HTTP_STATUS.FORBIDDEN, "FORBIDDEN");
  }
}

/** Requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, "NOT_FOUND");
  }
}

/** Insufficient balance for the requested operation. */
export class BalanceError extends AppError {
  constructor(message = "Insufficient balance") {
    super(message, HTTP_STATUS.BAD_REQUEST, "INSUFFICIENT_BALANCE");
  }
}

/** Conflict — e.g. task already completed, duplicate submission. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.CONFLICT, "CONFLICT");
  }
}

/** Rate limit exceeded. */
export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, "RATE_LIMITED");
  }
}

/** Request payload exceeds size limit. */
export class PayloadTooLargeError extends AppError {
  constructor(limit: number) {
    super(
      `Payload exceeds ${limit} bytes`,
      HTTP_STATUS.PAYLOAD_TOO_LARGE,
      "PAYLOAD_TOO_LARGE",
    );
  }
}

/** Worker is suspended and cannot claim tasks. */
export class SuspendedError extends AppError {
  constructor(until: Date) {
    super(
      `Worker suspended until ${until.toISOString()}`,
      HTTP_STATUS.FORBIDDEN,
      "WORKER_SUSPENDED",
    );
  }
}
