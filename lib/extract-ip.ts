/**
 * Extracts the client IP address from a request.
 * Checks Cloudflare and standard proxy headers.
 */

/** Header priority for IP extraction (most reliable first). */
const IP_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
] as const;

/**
 * Extracts the client IP from request headers.
 * Returns "unknown" if no IP can be determined.
 */
export function extractIp(request: Request): string {
  for (const header of IP_HEADERS) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can be comma-separated; take the first (client) IP
      const ip = value.split(",")[0].trim();
      if (ip) return ip;
    }
  }
  return "unknown";
}
