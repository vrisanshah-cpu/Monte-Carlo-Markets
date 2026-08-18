'use client';

import Link from 'next/link';

export default function ContestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isAuthError = error.message?.toLowerCase().includes('auth');
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-bold text-slate-100">
        {isAuthError ? 'Please log in to continue' : 'Something went wrong'}
      </h1>
      <p className="text-sm text-slate-400">
        {isAuthError
          ? 'You need an account to submit an entry to this contest.'
          : 'This page hit an unexpected error. You can try again below.'}
      </p>
      <div className="flex gap-3">
        {isAuthError ? (
          <Link
            href="/signup"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Create an account
          </Link>
        ) : (
          <button
            onClick={reset}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Try again
          </button>
        )}
      </div>
    </main>
  );
}