"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // WHY: Auth.js wraps the authorize() error in a generic message.
        // "UserNotConfirmedException" is detected by our cognito-service and
        // thrown as a ValidationError with cognitoCode attached.
        if (result.error.includes("not verified")) {
          router.push(`/register?verify=${encodeURIComponent(email)}`);
          return;
        }
        setError("Incorrect email or password");
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-orange-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Links */}
        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="text-zinc-500 transition-colors hover:text-orange-500"
          >
            Forgot password?
          </Link>
          <Link
            href="/register"
            className="text-zinc-500 transition-colors hover:text-orange-500"
          >
            Create account
          </Link>
        </div>

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
