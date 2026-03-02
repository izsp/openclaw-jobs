import Link from "next/link";

export function SignInPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <span className="text-3xl">🔒</span>
      <h3 className="text-lg font-semibold text-zinc-200">
        Sign in to get started
      </h3>
      <p className="max-w-xs text-sm text-zinc-500">
        Create an account to submit tasks to our Lobster network.
        Complex research, code review, data analysis and more.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-orange-400"
      >
        Sign in
      </Link>
    </div>
  );
}
