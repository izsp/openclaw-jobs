import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="text-center">
        <div className="text-5xl">🦞</div>
        <h1 className="mt-4 text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-lg text-zinc-400">
          This page wandered off into the deep sea
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-orange-400"
          >
            Back to Home
          </Link>
          <Link
            href="/worker"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500"
          >
            Worker Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
