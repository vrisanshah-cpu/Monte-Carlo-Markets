'use client';

import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: 'positive' | 'negative' | 'neutral' | 'accent';
  icon?: ReactNode;
  tooltip?: ReactNode;
}

const toneClasses: Record<string, string> = {
  positive: 'text-emerald-400',
  negative: 'text-rose-400',
  neutral: 'text-slate-100',
  accent: 'text-cyan-400',
};

export function MetricCard({ label, value, sublabel, tone = 'neutral', icon, tooltip }: MetricCardProps) {
  return (
    <motion.div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-slate-500">{sublabel}</div>}
      {tooltip && <div className="mt-1 text-xs text-slate-500">{tooltip}</div>}
    </motion.div>
  );
}
