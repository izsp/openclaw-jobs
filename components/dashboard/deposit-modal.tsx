"use client";

import { useState } from "react";
import { createCheckout } from "@/lib/api/deposit-client";

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TIERS = [
  { cents: 500, label: "Starter", shrimp: "500🦐", price: "$5" },
  { cents: 2000, label: "Standard", shrimp: "2,000🦐", price: "$20" },
  { cents: 10000, label: "Pro", shrimp: "10,000🦐", price: "$100" },
  { cents: 50000, label: "Business", shrimp: "50,000🦐", price: "$500" },
];

export function DepositModal({ open, onClose, onSuccess }: DepositModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSelect(cents: number) {
    setLoading(true);
    setError(null);
    try {
      const result = await createCheckout(cents);
      // Redirect to Stripe Checkout
      window.location.href = result.url;
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-edge bg-elevated p-6">
        <h2 className="text-lg font-semibold text-content">Add Funds</h2>
        <p className="mt-1 text-sm text-content-tertiary">
          Choose a credit pack. 100🦐 = $1.00 USD
        </p>

        <div className="mt-4 space-y-2">
          {TIERS.map((tier) => (
            <button
              key={tier.cents}
              onClick={() => handleSelect(tier.cents)}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-lg border border-edge px-4 py-3 text-sm transition-colors hover:border-edge-strong hover:bg-surface-alt disabled:opacity-50"
            >
              <span>
                <span className="font-medium text-content">{tier.label}</span>
                <span className="ml-2 text-content-secondary">{tier.shrimp}</span>
              </span>
              <span className="text-content-tertiary">{tier.price}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs text-status-error">{error}</p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-content-tertiary transition-colors hover:text-content-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
