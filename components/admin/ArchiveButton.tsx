'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveChallenge } from '@/actions/challenges';

export function ArchiveButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await archiveChallenge(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive');
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        onClick={handleClick}
        disabled={disabled || isPending}
        className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-950/70 disabled:opacity-40"
      >
        {isPending ? 'Archiving…' : 'Archive'}
      </button>
      {error && <span className="mt-1 text-[10px] text-rose-400">{error}</span>}
    </div>
  );
}
