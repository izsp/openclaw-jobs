import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-content">
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-lg text-content-tertiary">
          This page wandered off into the deep sea
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-content px-5 py-2.5 text-sm font-medium text-page transition-colors hover:opacity-90"
          >
            Back to Home
          </Link>
          <Link
            href="/worker"
            className="rounded-lg border border-edge px-5 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:border-edge-strong"
          >
            Worker Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
