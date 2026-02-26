"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn()}
      className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-orange-500 hover:text-orange-500"
    >
      Sign in
    </button>
  );
}
