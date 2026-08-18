'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createChallenge, updateChallenge, type ChallengePayload } from '@/actions/challenges';

interface ChallengeFormProps {
  initial?: Partial<ChallengePayload> & { id?: string };
}

const CLIMATE_SCENARIOS = ['orderly', 'disorderly', 'hothouse'] as const;

export function ChallengeForm({ initial }: ChallengeFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ChallengePayload>({
    slug: initial?.slug ?? '',
    title: initial?.title ?? '',
    tagline: initial?.tagline ?? '',
    description: initial?.description ?? '',
    theme: initial?.theme ?? 'custom',
    max_carbon_intensity: initial?.max_carbon_intensity ?? null,
    min_green_allocation: initial?.min_green_allocation ?? null,
    climate_scenario: initial?.climate_scenario ?? 'orderly',
    physical_risk_intensity: initial?.physical_risk_intensity ?? 1,
    tipping_point_prob: initial?.tipping_point_prob ?? 0,
    carbon_tax_onset_year: initial?.carbon_tax_onset_year ?? 5,
    years: initial?.years ?? 10,
    initial_balance: initial?.initial_balance ?? 100_000,
    weight_sharpe: initial?.weight_sharpe ?? 1,
    weight_climate_var: initial?.weight_climate_var ?? 1,
    weight_temp_rise: initial?.weight_temp_rise ?? 1,
    status: initial?.status ?? 'draft',
    starts_at: initial?.starts_at ?? '',
    ends_at: initial?.ends_at ?? '',
  });

  const set = <K extends keyof ChallengePayload>(key: K, value: ChallengePayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateChallenge(initial.id, form);
        } else {
          await createChallenge(form);
        }
        router.push('/admin');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Slug">
          <input className="input" value={form.slug} onChange={(e) => set('slug', e.target.value)} required />
        </Field>
        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => set('status', e.target.value as ChallengePayload['status'])}
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </Field>
      </div>

      <Field label="Title">
        <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      <Field label="Tagline">
        <input className="input" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </Field>
      <Field label="Description">
        <textarea
          className="input min-h-24"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Climate scenario">
          <select
            className="input"
            value={form.climate_scenario ?? 'orderly'}
            onChange={(e) => set('climate_scenario', e.target.value)}
          >
            {CLIMATE_SCENARIOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Years">
          <input
            type="number"
            className="input"
            value={form.years}
            onChange={(e) => set('years', Number(e.target.value))}
          />
        </Field>
        <Field label="Initial balance ($)">
          <input
            type="number"
            className="input"
            value={form.initial_balance}
            onChange={(e) => set('initial_balance', Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Max carbon intensity (t/$M)">
          <input
            type="number"
            className="input"
            value={form.max_carbon_intensity ?? ''}
            onChange={(e) =>
              set('max_carbon_intensity', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </Field>
        <Field label="Min green allocation (0-1)">
          <input
            type="number"
            step={0.05}
            className="input"
            value={form.min_green_allocation ?? ''}
            onChange={(e) =>
              set('min_green_allocation', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </Field>
        <Field label="Carbon tax onset year">
          <input
            type="number"
            className="input"
            value={form.carbon_tax_onset_year}
            onChange={(e) => set('carbon_tax_onset_year', Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Physical risk intensity">
          <input
            type="number"
            step={0.1}
            className="input"
            value={form.physical_risk_intensity}
            onChange={(e) => set('physical_risk_intensity', Number(e.target.value))}
          />
        </Field>
        <Field label="Tipping point prob (0-1/yr)">
          <input
            type="number"
            step={0.005}
            className="input"
            value={form.tipping_point_prob}
            onChange={(e) => set('tipping_point_prob', Number(e.target.value))}
          />
        </Field>
      </div>

      <h3 className="pt-2 text-sm font-semibold text-slate-300">
        Scoring weights — Score = w1·Sharpe + w2·(1/ClimateVaR) − w3·(TempRise − 1.5)
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <Field label="w1 — Sharpe">
          <input
            type="number"
            step={0.1}
            className="input"
            value={form.weight_sharpe}
            onChange={(e) => set('weight_sharpe', Number(e.target.value))}
          />
        </Field>
        <Field label="w2 — Climate VaR">
          <input
            type="number"
            step={0.1}
            className="input"
            value={form.weight_climate_var}
            onChange={(e) => set('weight_climate_var', Number(e.target.value))}
          />
        </Field>
        <Field label="w3 — Temp rise">
          <input
            type="number"
            step={0.1}
            className="input"
            value={form.weight_temp_rise}
            onChange={(e) => set('weight_temp_rise', Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date">
          <input
            type="datetime-local"
            className="input"
            value={form.starts_at ?? ''}
            onChange={(e) => set('starts_at', e.target.value)}
          />
        </Field>
        <Field label="End date">
          <input
            type="datetime-local"
            className="input"
            value={form.ends_at ?? ''}
            onChange={(e) => set('ends_at', e.target.value)}
          />
        </Field>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create challenge'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}
