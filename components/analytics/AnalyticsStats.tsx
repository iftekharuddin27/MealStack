'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

export default function AnalyticsStats() {
  const { data, isLoading, error } = useAnalytics();
  const stats = [
    {
      label: 'At-risk value rescued · this week',
      value: isLoading ? '—' : `৳ ${(data?.rescued_value_7d ?? 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`,
      detail: 'Consumed within 48h of expiry',
      color: 'text-green-400',
    },
    {
      label: 'Recipes cooked · this week',
      value: isLoading ? '—' : data?.recipes_cooked_7d ?? 0,
      detail: 'From Sunday to today',
      color: 'text-teal-400',
    },
    {
      label: 'Inventory lots rescued',
      value: isLoading ? '—' : data?.items_rescued ?? 0,
      detail: 'At-risk lots consumed in 30 days',
      color: 'text-amber-400',
    },
    {
      label: 'Tracked waste rate',
      value: isLoading ? '—' : `${(data?.waste_rate_pct ?? 0).toFixed(1)}%`,
      detail: 'Discarded value ÷ tracked outcomes',
      color: 'text-red-400',
    },
  ];

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Analytics could not be loaded: {error.message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4 sm:p-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </div>
            <div className={`font-head text-3xl tracking-tight sm:text-4xl ${stat.color}`}>
              {stat.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
