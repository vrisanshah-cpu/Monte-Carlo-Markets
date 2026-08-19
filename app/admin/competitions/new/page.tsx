import { CompetitionForm } from '@/components/admin/CompetitionForm';

export default function NewCompetitionPage() {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-slate-100">
        New Simulated Competition
      </h2>

      <p className="mb-6 text-sm text-slate-500">
        Configure a paper-trading climate competition.
      </p>

      <CompetitionForm />
    </div>
  );
}