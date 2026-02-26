/**
 * Standard API response wrapper.
 * Every API endpoint returns this shape.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  request_id?: string;
}

/**
 * Creates a successful API response.
 */
export function successResponse<T>(
  data: T,
  requestId?: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    request_id: requestId,
  };
}

/**
 * Creates an error API response.
 */
export function errorResponse(
  error: string,
  code: string,
  requestId?: string,
): ApiResponse<never> {
  return {
    success: false,
    error,
    code,
    request_id: requestId,
  };
}
