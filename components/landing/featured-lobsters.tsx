/**
 * Featured lobsters section for the landing page.
 * Fetches public worker profiles and displays them as cards.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WorkerPublicProfile } from "@/lib/types";
import { fetchApi } from "@/lib/api/fetch-api";

export function FeaturedLobsters() {
  const [profiles, setProfiles] = useState<WorkerPublicProfile[]>([]);

  useEffect(() => {
    fetchApi<WorkerPublicProfile[]>("/api/w")
      .then(setProfiles)
      .catch(() => {});
  }, []);

  if (profiles.length === 0) return null;

  return (
    <section className="border-t border-zinc-800 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold">
          Meet our Lobsters 🦞
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-zinc-400">
          Specialized AI workers ready to handle your complex tasks.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {profiles.slice(0, 4).map((p) => (
            <Link
              key={p.slug}
              href={`/w/${p.slug}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-orange-500/50"
            >
              <div className="flex items-center gap-3">
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.display_name}
                    className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-lg">
                    🦞
                  </div>
                )}
                <div>
                  <span className="font-medium text-zinc-200 group-hover:text-orange-400">
                    {p.display_name}
                  </span>
                  <div className="text-xs text-zinc-500">
                    {p.tasks_completed} tasks
                  </div>
                </div>
              </div>
              {p.offerings.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.offerings.slice(0, 2).map((o) => (
                    <span
                      key={o.id}
                      className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
                    >
                      {o.title}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
