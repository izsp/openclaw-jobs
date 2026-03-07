/**
 * Next.js Middleware — subdomain-based routing for AI-first architecture.
 *
 * Root domain (openclaw.jobs):
 *   / → rewrite to /agent-landing
 *   /chat, /dashboard, /worker, /login, etc. → 308 redirect to human.openclaw.jobs
 *   /api/*, /admin/*, /_next/*, /skill* → pass through
 *
 * human.openclaw.jobs → pass through (renders existing pages)
 * staging.openclaw.jobs → agent landing on /, human paths served directly (no redirect)
 * localhost → no subdomain logic, everything passes through
 */
import { NextRequest, NextResponse } from "next/server";

/** Human-facing paths that should redirect to human.* on root domain */
const HUMAN_PATH_PREFIXES = [
  "/chat",
  "/dashboard",
  "/worker",
  "/login",
  "/register",
  "/forgot-password",
  "/w/",
];

/** Paths that always pass through regardless of subdomain */
const PASSTHROUGH_PREFIXES = [
  "/api/",
  "/admin",
  "/skill",
  "/_next/",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "localhost:3000";

  // /skill.md → rewrite to /skill route handler
  if (pathname === "/skill.md") {
    const url = request.nextUrl.clone();
    url.pathname = "/skill";
    return NextResponse.rewrite(url);
  }

  // Passthrough paths — always serve directly
  if (PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Localhost / dev — no subdomain logic, serve everything directly
  if (isLocalhost(hostname)) {
    return NextResponse.next();
  }

  // human.* subdomain — pass through to existing pages
  if (hostname.startsWith("human.")) {
    return NextResponse.next();
  }

  // staging.* — agent domain for staging environment
  // Human paths redirect to human-staging.* (single-level subdomain, covered by *.openclaw.jobs cert)
  if (hostname.startsWith("staging.")) {
    if (isHumanPath(pathname)) {
      const rootDomain = extractRootDomain(hostname).replace(/^staging\./, "");
      const redirectUrl = new URL(
        `${request.nextUrl.protocol}//human-staging.${rootDomain}${pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(redirectUrl, 308);
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/agent-landing";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // human-staging.* — pass through (staging human interface)
  if (hostname.startsWith("human-staging.")) {
    return NextResponse.next();
  }

  // Root domain: redirect human paths to human.* subdomain
  if (isHumanPath(pathname)) {
    const rootDomain = extractRootDomain(hostname);
    const redirectUrl = new URL(
      `${request.nextUrl.protocol}//human.${rootDomain}${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Root domain "/" → rewrite to /agent-landing
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/agent-landing";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1")
  );
}

function isHumanPath(pathname: string): boolean {
  return HUMAN_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

function extractRootDomain(hostname: string): string {
  // Remove port if present
  return hostname.split(":")[0];
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files.
     * _next/static and _next/image are handled by Next.js internally.
     */
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$).*)",
  ],
};
