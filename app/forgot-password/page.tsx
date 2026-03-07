"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "email" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/cognito/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to send code");
        return;
      }

      setStep("reset");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/cognito/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to reset password");
        return;
      }

      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl">🦞</div>
          <h1 className="mt-3 text-2xl font-bold text-content">
            {step === "email" && "Reset your password"}
            {step === "reset" && "Enter new password"}
            {step === "done" && "Password reset!"}
          </h1>
          <p className="mt-1 text-sm text-content-tertiary">
            {step === "email" && "We'll send a verification code to your email"}
            {step === "reset" && `Enter the code sent to ${email}`}
            {step === "done" && "Your password has been updated"}
          </p>
        </div>

        {/* Step 1: Enter email */}
        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-4">
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

            {error && <p className="text-sm text-status-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-content px-4 py-3 text-sm font-medium text-page transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending code..." : "Send verification code"}
            </button>
          </form>
        )}

        {/* Step 2: Code + new password */}
        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
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
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-content-secondary">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-content placeholder-content-tertiary focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
                placeholder="At least 8 characters"
              />
            </div>

            {error && <p className="text-sm text-status-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex w-full items-center justify-center rounded-lg bg-content px-4 py-3 text-sm font-medium text-page transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <button
            onClick={() => router.push("/login")}
            className="flex w-full items-center justify-center rounded-lg bg-content px-4 py-3 text-sm font-medium text-page transition-colors hover:opacity-90"
          >
            Go to sign in
          </button>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-content-tertiary transition-colors hover:text-content-secondary"
          >
            &larr; Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
