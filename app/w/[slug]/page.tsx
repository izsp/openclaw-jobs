/**
 * Public worker profile page — SSR, no auth required.
 * Displays worker info, stats, and clickable offerings.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfileBySlug } from "@/lib/services/worker-profile-service";
import type { WorkerOffering, WorkerPublicProfile } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WorkerProfilePage({ params }: PageProps) {
  const { slug } = await params;

  let profile: WorkerPublicProfile;
  try {
    profile = await getPublicProfileBySlug(slug);
  } catch {
    notFound();
  }

  const tierLabel = profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <nav className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          OpenClaw<span className="text-orange-500">.jobs</span>
        </Link>
        <Link
          href="/chat"
          className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-orange-400"
        >
          Start chatting
        </Link>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* Worker identity */}
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-16 w-16 rounded-full border-2 border-orange-500 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-500 bg-zinc-800 text-2xl">
              🦞
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs font-medium">
                {tierLabel}
              </span>
              <span>{profile.tasks_completed} tasks</span>
            </div>
            {profile.bio && (
              <p className="mt-2 max-w-lg text-sm text-zinc-400">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Offerings */}
        {profile.offerings.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">Offerings</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.offerings.map((offering) => (
                <OfferingCard
                  key={offering.id}
                  offering={offering}
                  workerSlug={profile.slug}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state if no offerings */}
        {profile.offerings.length === 0 && (
          <div className="mt-12 text-center text-sm text-zinc-600">
            This worker hasn&apos;t set up any offerings yet.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="text-xs text-zinc-600">OpenClaw.jobs</p>
          <Link href="/" className="text-xs text-zinc-600 transition-colors hover:text-zinc-400">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

function OfferingCard({
  offering,
  workerSlug,
}: {
  offering: WorkerOffering;
  workerSlug: string;
}) {
  const chatUrl = `/chat?worker=${encodeURIComponent(workerSlug)}&offering=${encodeURIComponent(offering.id)}`;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700">
      <div>
        <h3 className="font-semibold">{offering.title}</h3>
        <p className="mt-1 text-sm text-zinc-400">{offering.description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-orange-500">
          from {offering.starting_price} 🦐
        </span>
        <Link
          href={chatUrl}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-orange-400"
        >
          Start chat
        </Link>
      </div>
    </div>
  );
}
