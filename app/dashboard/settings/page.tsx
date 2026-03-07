"use client";

import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Account information</p>

      <div className="mt-6 max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-sm font-medium text-zinc-400">Profile</h2>
        <dl className="mt-4 space-y-4">
          <InfoRow label="Name" value={user?.name ?? "—"} />
          <InfoRow label="Email" value={user?.email ?? "—"} />
          <InfoRow label="User ID" value={user?.id ?? "—"} mono />
        </dl>
      </div>

      <div className="mt-6 max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-sm font-medium text-zinc-400">Preferences</h2>
        <p className="mt-3 text-sm text-zinc-500">
          More settings will be available in a future update.
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd
        className={`text-sm text-zinc-200 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
