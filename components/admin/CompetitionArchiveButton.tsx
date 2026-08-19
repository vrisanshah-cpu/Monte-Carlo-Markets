'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveCompetition } from '@/actions/competitions';

export function CompetitionArchiveButton({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!window.confirm('Archive this competition?')) return;

    setError(null);

    startTransition(async () => {
      try {
        await archiveCompetition(id);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to archive'
        );
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-950/70 disabled:opacity-40"
      >
        {pending ? 'Archiving...' : 'Archive'}
      </button>

      {error && (
        <span className="mt-1 text-[10px] text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
}