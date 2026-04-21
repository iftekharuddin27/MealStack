// ============================================================
// MealStack · AnalyticsStats Component
// Four stat cards for the Waste Analytics page.
// ============================================================

'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

export default function AnalyticsStats() {
  const { data, isLoading } = useAnalytics();

  const stats = [
    {
      label: 'Total saved · this week',
      value: isLoading ? '—' : `৳ ${(data?.total_saved_7d ?? 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`,
      delta: 'vs ৳ 0 if wasted',
      color: 'text-green-400',
    },
    {
      label: 'Recipes cooked · this week',
      value: isLoading ? '—' : data?.recipes_cooked_7d ?? 0,
      delta: 'From Sunday to today',
      color: 'text-teal-400',
    },
    {
      label: 'Items rescued',
      value: isLoading ? '—' : data?.items_rescued ?? 0,
      delta: 'Before expiry cutoff',
      color: 'text-amber-400',
    },
    {
      label: 'Waste rate',
      value: isLoading ? '—' : `${data?.waste_rate_pct ?? 0}%`,
      delta: 'Down from 31% without app',
      color: 'text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="card p-4 sm:p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-subtle mb-2">
            {s.label}
          </div>
          <div className={`font-head text-3xl sm:text-4xl tracking-tight ${s.color}`}>{s.value}</div>
          <div className="mt-1 text-xs text-subtle">{s.delta}</div>
        </div>
      ))}
    </div>
  );
}
