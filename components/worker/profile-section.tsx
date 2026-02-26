/**
 * Worker profile management: email binding, payout method, preferences.
 */
"use client";

import { useState } from "react";
import { bindEmail, bindPayout } from "@/lib/api/worker-client";

interface ProfileSectionProps {
  email: string | null;
  payout: { method: string; address: string } | null;
  onUpdate: () => void;
}

export function ProfileSection({ email, payout, onUpdate }: ProfileSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
      <h2 className="text-sm font-medium text-zinc-500">Profile</h2>

      <EmailBinding currentEmail={email} onBound={onUpdate} />
      <div className="border-t border-zinc-800" />
      <PayoutBinding currentPayout={payout} onBound={onUpdate} />
    </div>
  );
}

function EmailBinding({ currentEmail, onBound }: { currentEmail: string | null; onBound: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentEmail) {
    return (
      <div>
        <label className="text-xs text-zinc-500">Email</label>
        <p className="mt-1 text-sm text-zinc-300">{currentEmail}</p>
      </div>
    );
  }

  async function handleBind(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await bindEmail(email.trim());
      onBound();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bind email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleBind} className="space-y-2">
      <label className="text-xs text-zinc-500">Bind Email</label>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
        >
          Bind
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

function PayoutBinding({ currentPayout, onBound }: { currentPayout: { method: string; address: string } | null; onBound: () => void }) {
  const [method, setMethod] = useState<"paypal" | "solana">("paypal");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentPayout) {
    return (
      <div>
        <label className="text-xs text-zinc-500">Payout Method</label>
        <p className="mt-1 text-sm text-zinc-300">
          <span className="capitalize">{currentPayout.method}</span>:{" "}
          <span className="text-zinc-400">{currentPayout.address}</span>
        </p>
      </div>
    );
  }

  async function handleBind(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await bindPayout(method, address.trim());
      onBound();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bind payout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleBind} className="space-y-2">
      <label className="text-xs text-zinc-500">Bind Payout Method</label>
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as "paypal" | "solana")}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none"
        >
          <option value="paypal">PayPal</option>
          <option value="solana">Solana</option>
        </select>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={method === "paypal" ? "you@paypal.com" : "Solana address"}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
        >
          Bind
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
