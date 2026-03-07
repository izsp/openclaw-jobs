import Link from "next/link";

export function SignInPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <h3 className="text-lg font-semibold text-content">
        Sign in to get started
      </h3>
      <p className="max-w-xs text-sm text-content-tertiary">
        Create an account to submit tasks to our Lobster network.
        Complex research, code review, data analysis and more.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-content px-6 py-2.5 text-sm font-medium text-page transition-opacity hover:opacity-90"
      >
        Sign in
      </Link>
    </div>
  );
}
