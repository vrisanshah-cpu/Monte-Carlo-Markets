'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCompetition,
  updateCompetition,
  type CompetitionPayload,
} from '@/actions/competitions';
import type { LifeEvent, ScriptedShock } from '@/lib/types/trading';

interface CompetitionFormProps {
  initial?: Partial<CompetitionPayload> & { id?: string };
}

const CLIMATE_SCENARIOS = [
  'orderly',
  'disorderly',
  'hothouse',
] as const;

function toLocalInput(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function toISOString(value: string) {
  if (!value) return '';

  return new Date(value).toISOString();
}

export function CompetitionForm({
  initial,
}: CompetitionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    climate_scenario:
      initial?.climate_scenario ?? 'orderly',
    start_date: toLocalInput(initial?.start_date),
    end_date: toLocalInput(initial?.end_date),
    status: initial?.status ?? 'draft',
    starting_balance: initial?.starting_balance ?? 100000,
  });

  const [shocks, setShocks] = useState<ScriptedShock[]>(
    initial?.scripted_shocks ?? []
  );

  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>(
    initial?.life_events ?? []
  );

  const setField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const addShock = () => {
    setShocks((current) => [
      ...current,
      {
        year: 1,
        name: '',
        type: 'market_event',
        magnitude: -0.1,
        affects: [],
        description: '',
      },
    ]);
  };

  const updateShock = (
    index: number,
    patch: Partial<ScriptedShock>
  ) => {
    setShocks((current) =>
      current.map((shock, i) =>
        i === index ? { ...shock, ...patch } : shock
      )
    );
  };

  const removeShock = (index: number) => {
    setShocks((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const addLifeEvent = () => {
    setLifeEvents((current) => [
      ...current,
      {
        year: 1,
        label: '',
        amount: 0,
      },
    ]);
  };

  const updateLifeEvent = (
    index: number,
    patch: Partial<LifeEvent>
  ) => {
    setLifeEvents((current) =>
      current.map((event, i) =>
        i === index ? { ...event, ...patch } : event
      )
    );
  };

  const removeLifeEvent = (index: number) => {
    setLifeEvents((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const payload: CompetitionPayload = {
          title: form.title,
          description: form.description,
          climate_scenario:
            form.climate_scenario as CompetitionPayload['climate_scenario'],
          start_date: toISOString(form.start_date),
          end_date: toISOString(form.end_date),
          status:
            form.status as CompetitionPayload['status'],
          starting_balance: Number(form.starting_balance),
          scripted_shocks: shocks,
          life_events: lifeEvents,
        };

        if (isEdit && initial?.id) {
          await updateCompetition(initial.id, payload);
        } else {
          await createCompetition(payload);
        }

        router.push('/admin/competitions');
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Save failed'
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Competition title">
          <input
            className="input"
            value={form.title}
            onChange={(e) =>
              setField('title', e.target.value)
            }
            placeholder="Climate Transition Challenge"
            required
          />
        </Field>

        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) =>
              setField(
                'status',
                e.target.value as typeof form.status
              )
            }
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea
          className="input min-h-28"
          value={form.description}
          onChange={(e) =>
            setField('description', e.target.value)
          }
          placeholder="Build a portfolio while navigating climate-related market shocks."
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Climate scenario">
          <select
            className="input"
            value={form.climate_scenario}
            onChange={(e) =>
              setField(
                'climate_scenario',
                e.target.value as typeof form.climate_scenario
              )
            }
          >
            {CLIMATE_SCENARIOS.map((scenario) => (
              <option key={scenario} value={scenario}>
                {scenario}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Simulated starting balance">
          <input
            type="number"
            min="1"
            step="1000"
            className="input"
            value={form.starting_balance}
            onChange={(e) =>
              setField(
                'starting_balance',
                Number(e.target.value)
              )
            }
          />
        </Field>

        <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-3 text-xs text-cyan-300">
          This is simulated paper money. No real-money
          deposits or payouts are used.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Start date">
          <input
            type="datetime-local"
            className="input"
            value={form.start_date}
            onChange={(e) =>
              setField('start_date', e.target.value)
            }
            required
          />
        </Field>

        <Field label="End date">
          <input
            type="datetime-local"
            className="input"
            value={form.end_date}
            onChange={(e) =>
              setField('end_date', e.target.value)
            }
            required
          />
        </Field>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-100">
              Scripted climate shocks
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Preset events that affect the simulated market.
            </p>
          </div>

          <button
            type="button"
            onClick={addShock}
            className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-500"
          >
            + Add shock
          </button>
        </div>

        {shocks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
            No scripted shocks. Add one if this competition
            should include climate events.
          </p>
        ) : (
          <div className="space-y-4">
            {shocks.map((shock, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <Field label="Year">
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={shock.year}
                      onChange={(e) =>
                        updateShock(index, {
                          year: Number(e.target.value),
                        })
                      }
                    />
                  </Field>

                  <Field label="Name">
                    <input
                      className="input"
                      value={shock.name}
                      onChange={(e) =>
                        updateShock(index, {
                          name: e.target.value,
                        })
                      }
                      placeholder="Major flood"
                    />
                  </Field>

                  <Field label="Type">
                    <select
                      className="input"
                      value={shock.type}
                      onChange={(e) =>
                        updateShock(index, {
                          type: e.target.value as ScriptedShock['type'],
                        })
                      }
                    >
                      <option value="market_event">
                        Market event
                      </option>
                      <option value="physical_shock">
                        Physical shock
                      </option>
                      <option value="policy_shock">
                        Policy shock
                      </option>
                    </select>
                  </Field>

                  <Field label="Magnitude">
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={shock.magnitude}
                      onChange={(e) =>
                        updateShock(index, {
                          magnitude: Number(e.target.value),
                        })
                      }
                      placeholder="-0.15"
                    />
                  </Field>
                </div>

                <div className="mt-3">
                  <Field label="Affected tickers">
                    <input
                      className="input"
                      value={shock.affects.join(', ')}
                      onChange={(e) =>
                        updateShock(index, {
                          affects: e.target.value
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="TSLA, ENPH, NEE"
                    />
                  </Field>
                </div>

                <div className="mt-3">
                  <Field label="Description">
                    <input
                      className="input"
                      value={shock.description ?? ''}
                      onChange={(e) =>
                        updateShock(index, {
                          description: e.target.value,
                        })
                      }
                      placeholder="A severe physical climate event hits coastal infrastructure."
                    />
                  </Field>
                </div>

                <button
                  type="button"
                  onClick={() => removeShock(index)}
                  className="mt-3 rounded-lg border border-rose-900 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-950/50"
                >
                  Remove shock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-100">
              Life events
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Simulated cash flows shared by participants.
            </p>
          </div>

          <button
            type="button"
            onClick={addLifeEvent}
            className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-500"
          >
            + Add life event
          </button>
        </div>

        {lifeEvents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
            No life events configured.
          </p>
        ) : (
          <div className="space-y-3">
            {lifeEvents.map((event, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[120px_1fr_180px_auto]"
              >
                <Field label="Year">
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={event.year}
                    onChange={(e) =>
                      updateLifeEvent(index, {
                        year: Number(e.target.value),
                      })
                    }
                  />
                </Field>

                <Field label="Label">
                  <input
                    className="input"
                    value={event.label}
                    onChange={(e) =>
                      updateLifeEvent(index, {
                        label: e.target.value,
                      })
                    }
                    placeholder="Emergency expense"
                  />
                </Field>

                <Field label="Amount">
                  <input
                    type="number"
                    step="100"
                    className="input"
                    value={event.amount}
                    onChange={(e) =>
                      updateLifeEvent(index, {
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => removeLifeEvent(index)}
                  className="self-end rounded-lg border border-rose-900 bg-rose-950/30 px-3 py-2 text-xs text-rose-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
      >
        {isPending
          ? 'Saving...'
          : isEdit
            ? 'Save competition'
            : 'Create competition'}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}