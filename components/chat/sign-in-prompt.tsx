"use client";

import { signIn } from "next-auth/react";

export function SignInPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <span className="text-3xl">🔒</span>
      <h3 className="text-lg font-semibold text-zinc-200">
        Sign in to get started
      </h3>
      <p className="max-w-xs text-sm text-zinc-500">
        Create an account to submit tasks to our Lobster network.
        Complex research, code review, data analysis and more.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => signIn("google")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500"
        >
          Google
        </button>
        <button
          onClick={() => signIn("github")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500"
        >
          GitHub
        </button>
      </div>
    </div>
  );
}
