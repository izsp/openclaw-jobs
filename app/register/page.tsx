"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "register" | "verify";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // WHY: If redirected from login with an unverified email, jump to verify step.
  const prefillEmail = searchParams.get("verify") ?? "";
  const [step, setStep] = useState<Step>(prefillEmail ? "verify" : "register");

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/cognito/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode: inviteCode || undefined }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Registration failed");
        return;
      }

      setStep("verify");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/cognito/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Verification failed");
        return;
      }

      // Auto-login after successful verification
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Password may have been cleared; redirect to login
        router.push("/login");
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

  async function handleResendCode() {
    setError("");
    try {
      const res = await fetch("/api/auth/cognito/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to resend code");
      }
    } catch {
      setError("Failed to resend code");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl">🦞</div>
          <h1 className="mt-3 text-2xl font-bold text-content">
            {step === "register" ? "Create your account" : "Verify your email"}
          </h1>
          <p className="mt-1 text-sm text-content-tertiary">
            {step === "register"
              ? "Start using OpenClaw in seconds"
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Step 1: Register */}
        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-content-secondary">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-content placeholder-content-tertiary focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-content-secondary">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-content placeholder-content-tertiary focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-content-secondary">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-content placeholder-content-tertiary focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-content-secondary">
                Invite code
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.trim())}
                className="mt-1 block w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-content placeholder-content-tertiary focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
                placeholder="Enter invite code"
              />
            </div>

            {error && <p className="text-sm text-status-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-content px-4 py-3 text-sm font-medium text-page transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        {/* Step 2: Verify */}
        {step === "verify" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-content-secondary">
                Verification code
              </label>
              <input
                id="code"
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="mt-1 block w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-center text-lg font-mono tracking-widest text-content placeholder-content-tertiary focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
                placeholder="000000"
              />
            </div>

            {error && <p className="text-sm text-status-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex w-full items-center justify-center rounded-lg bg-content px-4 py-3 text-sm font-medium text-page transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & sign in"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              className="w-full text-center text-sm text-content-tertiary transition-colors hover:text-content-secondary"
            >
              Resend code
            </button>
          </form>
        )}

        {/* Links */}
        <div className="text-center text-sm">
          <span className="text-content-tertiary">Already have an account? </span>
          <Link
            href="/login"
            className="text-content-tertiary transition-colors hover:text-content-secondary"
          >
            Sign in
          </Link>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-content-tertiary transition-colors hover:text-content-secondary"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
