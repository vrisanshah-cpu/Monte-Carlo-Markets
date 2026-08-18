import { getMyProfile } from '@/actions/profile';
import { getMySubmissions } from '@/actions/submissions';

export default async function DashboardPage() {
  const [profile, submissions] = await Promise.all([getMyProfile(), getMySubmissions()]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-slate-100">
        Welcome, {profile?.display_name ?? profile?.username ?? 'trader'}
      </h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Total Points" value={profile?.total_points?.toFixed(1) ?? '0'} />
        <Stat label="Simulations Run" value={String(profile?.simulations_run ?? 0)} />
        <Stat label="Contest Entries" value={String(submissions.filter((s) => s.challenge_id).length)} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-100">Submission History</h2>
      <div className="space-y-2">
        {submissions.length === 0 && (
          <p className="text-sm text-slate-500">No submissions yet — run a sandbox simulation or enter a contest.</p>
        )}
        {submissions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm"
          >
            <div>
              <div className="font-medium text-slate-200">
                {s.challenges?.title ?? `${s.mode} run`}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              {s.composite_score !== null && (
                <div className="font-semibold tabular-nums text-cyan-400">
                  Score: {Number(s.composite_score).toFixed(2)}
                </div>
              )}
              <div className="text-xs tabular-nums text-slate-500">
                Median: ${Math.round(s.result_summary?.medianFinal ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-100">{value}</div>
    </div>
  );
}
