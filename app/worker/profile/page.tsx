"use client";

import { useState, useEffect, useCallback } from "react";
import { getWorkerMe, type WorkerMeData } from "@/lib/api/worker-client";
import { ProfileSection } from "@/components/worker/profile-section";

export default function WorkerProfilePage() {
  const [data, setData] = useState<WorkerMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getWorkerMe());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className=" animate-pulse">
        <div className="h-7 w-32 rounded bg-zinc-800" />
        <div className="mt-6 h-48 rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-4 text-sm text-red-400">{error}</p>
        <button onClick={fetchData} className="mt-2 text-sm text-orange-500 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {data.worker_id} · {data.worker_type} · Member since{" "}
        {new Date(data.created_at).toLocaleDateString()}
      </p>

      <div className="mt-6 max-w-lg">
        <ProfileSection
          email={data.email}
          payout={data.payout}
          onUpdate={fetchData}
        />
      </div>
    </div>
  );
}
