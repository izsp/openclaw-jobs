/**
 * Hook to resolve worker ID and offering welcome message from URL params.
 * Fetches the public worker profile by slug and finds the matching offering.
 */
"use client";

import { useState, useEffect } from "react";
import type { WorkerPublicProfile } from "@/lib/types";
import { fetchApi } from "@/lib/api/fetch-api";

interface WorkerOfferingResult {
  workerId: string | null;
  welcomeMessage: string | null;
  loading: boolean;
}

/**
 * Resolves a worker slug + offering ID into a worker _id and welcome message.
 * Returns nulls when params are absent or fetch fails.
 */
export function useWorkerOffering(
  slug: string | null,
  offeringId: string | null,
): WorkerOfferingResult {
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!slug);

  useEffect(() => {
    if (!slug) {
      setWorkerId(null);
      setWelcomeMessage(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function resolve() {
      try {
        const profile = await fetchApi<WorkerPublicProfile & { worker_id: string }>(
          `/api/w/${encodeURIComponent(slug!)}`,
        );

        if (cancelled) return;

        setWorkerId(profile.worker_id);

        if (offeringId) {
          const offering = profile.offerings.find((o) => o.id === offeringId);
          setWelcomeMessage(offering?.welcome_message ?? null);
        }
      } catch {
        // Silently fail — chat will work without pre-assignment
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolve();
    return () => { cancelled = true; };
  }, [slug, offeringId]);

  return { workerId, welcomeMessage, loading };
}
