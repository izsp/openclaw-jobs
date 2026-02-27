"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl">🦞</div>
          <h1 className="mt-3 text-2xl font-bold text-zinc-100">
            Sign in to OpenClaw
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Get premium AI results at pay-per-use prices
          </p>
        </div>

        {/* Sign in button — redirects to Cognito Hosted UI */}
        <button
          onClick={() => signIn("cognito", { callbackUrl: "/chat" })}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-orange-400"
        >
          Sign in / Create Account
        </button>

        <p className="text-center text-xs text-zinc-600">
          Sign in with email + password, or use Google.
        </p>

        {/* Data disclosure */}
        <p className="text-center text-xs leading-relaxed text-zinc-600">
          By signing in you agree that tasks you submit will be processed
          by independent workers (&ldquo;Lobsters&rdquo;) who can see your
          task content. Do not include passwords, SSNs, or other secrets.
        </p>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-orange-500"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
