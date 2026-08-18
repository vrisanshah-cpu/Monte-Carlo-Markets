import Link from 'next/link';
import { listChallenges } from '@/actions/challenges';
import { ArchiveButton } from '@/components/admin/ArchiveButton';

export default async function AdminChallengesPage() {
  const challenges = await listChallenges();

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Title</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Scenario</th>
            <th className="px-4 py-3 text-left">Window</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {challenges.map((c) => (
            <tr key={c.id} className="hover:bg-slate-900/40">
              <td className="px-4 py-3 text-slate-200">{c.title}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    c.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : c.status === 'archived'
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400">{c.climate_scenario ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'} –{' '}
                {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/admin/challenges/${c.id}/edit`}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    Edit
                  </Link>
                  <ArchiveButton id={c.id} disabled={c.status === 'archived'} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
