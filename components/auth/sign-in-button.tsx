"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn()}
      className="rounded-full bg-content px-4 py-1.5 text-sm font-medium text-page transition-colors hover:opacity-90"
    >
      Sign in
    </button>
  );
}
