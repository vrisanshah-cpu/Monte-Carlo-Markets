'use client';

import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  className?: string;
}

// Hover/focus tooltip that explains financial terms in plain language.
export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children ?? (
        <Info className="h-3.5 w-3.5 text-slate-500 hover:text-cyan-400 transition-colors cursor-help" />
      )}
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs leading-relaxed text-slate-200 shadow-xl">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}

// Plain-language term explanations used throughout the app.
export const TERMS = {
  volatility: (
    <>How much an investment's value jumps around. High volatility means bigger swings up and down; low volatility means a smoother ride.</>
  ),
  sharpe: (
    <>A score that measures how much return you get for the risk you take. Higher is better — it means you're well paid for the scary moments.</>
  ),
  gbm: (
    <>A mathematical model that simulates stock prices as a mix of steady drift (average growth) plus random jolts. It's the classic engine behind option pricing.</>
  ),
  drawdown: (
    <>The drop from your portfolio's peak value to its lowest point. A 30% drawdown means you lost 30% from the top before recovering.</>
  ),
  bootstrap: (
    <>Instead of inventing random numbers, we replay real historical monthly returns shuffled in random order. This makes the simulation behave like actual market history.</>
  ),
  percentile: (
    <>A way to describe outcomes. The 90th percentile is a "great" result — 9 out of 10 runs did worse. The 10th percentile is a "bad" result — only 1 in 10 did worse.</>
  ),
  inflation: (
    <>The steady rise in prices that erodes what money can buy. $100 today buys less in 20 years. We can show results in "today's dollars" to account for this.</>
  ),
  rebalance: (
    <>Selling some winners and buying more of your laggards to return to your target mix. It keeps your risk level steady. Buy &amp; hold lets winners run.</>
  ),
  monteCarlo: (
    <>Running thousands of possible futures using random chance, then looking at the spread of outcomes to understand what's likely, optimistic, and pessimistic.</>
  ),
  resilience: (
    <>A 0-100 score combining how much your portfolio grew, how badly it fell during crashes, and how wisely you reacted to events. Higher means tougher and smarter.</>
  ),
} as const;
