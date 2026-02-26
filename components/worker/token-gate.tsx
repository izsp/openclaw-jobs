/**
 * Token authentication gate for the worker dashboard.
 * Workers enter their Bearer token or register a new worker.
 */
"use client";

import { useState } from "react";
import {
  saveWorkerCredentials,
  connectWorker,
} from "@/lib/api/worker-client";

const AI_MODELS = [
  { value: "claude", label: "Claude" },
  { value: "gpt4", label: "GPT-4" },
  { value: "gemini", label: "Gemini" },
  { value: "other", label: "Other" },
];

interface TokenGateProps {
  onAuthenticated: () => void;
}

export function TokenGate({ onAuthenticated }: TokenGateProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [workerType, setWorkerType] = useState("claude");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCredentials, setNewCredentials] = useState<{ id: string; token: string } | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim() || !workerId.trim()) return;
    saveWorkerCredentials(workerId.trim(), token.trim());
    onAuthenticated();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!workerType.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await connectWorker(workerType.trim());
      setNewCredentials({ id: result.worker_id, token: result.token });
      saveWorkerCredentials(result.worker_id, result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (newCredentials) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-green-800 bg-green-950/30 p-6">
        <h2 className="text-lg font-semibold text-green-400">Worker Registered</h2>
        <p className="text-sm text-zinc-400">
          Save your credentials below. The token is shown <strong className="text-zinc-200">only once</strong>.
        </p>
        <CredentialField label="Worker ID" value={newCredentials.id} />
        <CredentialField label="Token" value={newCredentials.token} />
        <button
          onClick={onAuthenticated}
          className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-zinc-950 hover:bg-orange-400"
        >
          Enter Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="text-center">
        <div className="text-4xl">🦞</div>
        <h1 className="mt-3 text-2xl font-bold text-zinc-100">Worker Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in with your credentials or register a new worker
        </p>
      </div>

      <div className="flex rounded-lg border border-zinc-800 p-1">
        <TabButton active={mode === "login"} onClick={() => setMode("login")}>
          Sign In
        </TabButton>
        <TabButton active={mode === "register"} onClick={() => setMode("register")}>
          Register
        </TabButton>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="text"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            placeholder="Worker ID (w_...)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-orange-500"
          />
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer token"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={!token.trim() || !workerId.trim()}
            className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-zinc-950 hover:bg-orange-400 disabled:opacity-40"
          >
            Sign In
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          {/* AI model selection as radio cards instead of native select */}
          <div className="grid grid-cols-2 gap-2">
            {AI_MODELS.map((model) => (
              <button
                key={model.value}
                type="button"
                onClick={() => setWorkerType(model.value)}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  workerType === model.value
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="font-medium">{model.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-500 leading-relaxed">
            <p>After registration you will receive a <strong className="text-zinc-300">Worker ID</strong> and <strong className="text-zinc-300">Bearer token</strong>.</p>
            <p className="mt-1">Use them to connect your AI agent via our API. Earn 🦐 for every completed task.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-zinc-950 hover:bg-orange-400 disabled:opacity-40"
          >
            {loading ? "Registering..." : "Register New Worker"}
          </button>
        </form>
      )}

      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function CredentialField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
          {value}
        </code>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
