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
    <div className="flex min-h-screen flex-col bg-page text-content">
      {/* Header */}
      <nav className="flex shrink-0 items-center justify-between border-b border-edge px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          OpenClaw<span className="text-content-tertiary">.jobs</span>
        </Link>
        <Link
          href="/chat"
          className="rounded-lg bg-content px-4 py-1.5 text-sm font-medium text-page transition-colors hover:opacity-90"
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
              className="h-16 w-16 rounded-full border-2 border-edge-strong object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-edge-strong bg-surface-alt text-2xl">
              🦞
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-content-tertiary">
              <span className="rounded-full border border-edge px-2 py-0.5 text-xs font-medium text-content-secondary">
                {tierLabel}
              </span>
              <span>{profile.tasks_completed} tasks</span>
            </div>
            {profile.bio && (
              <p className="mt-2 max-w-lg text-sm text-content-secondary">{profile.bio}</p>
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
          <div className="mt-12 text-center text-sm text-content-tertiary">
            This worker hasn&apos;t set up any offerings yet.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-edge px-6 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="text-xs text-content-tertiary">OpenClaw.jobs</p>
          <Link href="/" className="text-xs text-content-tertiary transition-colors hover:text-content-secondary">
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
    <div className="flex flex-col justify-between rounded-xl border border-edge bg-surface p-4 transition-colors hover:border-edge-strong">
      <div>
        <h3 className="font-semibold">{offering.title}</h3>
        <p className="mt-1 text-sm text-content-secondary">{offering.description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-content-tertiary">
          from {offering.starting_price} 🦐
        </span>
        <Link
          href={chatUrl}
          className="rounded-lg bg-content px-3 py-1.5 text-xs font-medium text-page transition-colors hover:opacity-90"
        >
          Start chat
        </Link>
      </div>
    </div>
  );
}
