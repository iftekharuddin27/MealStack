// ============================================================
// MealStack · SavingsChart Component
// Bar chart — money saved by not letting food expire.
// Uses Recharts (pre-installed with Next.js ecosystem).
// ============================================================

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg p-3 font-mono text-xs shadow-xl">
      <div className="text-subtle mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex gap-3 justify-between">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="text-foreground">৳{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SavingsChart() {
  const { data, isLoading } = useAnalytics();

  const chartData = (data?.weekly_trend ?? []).map((w) => ({
    week: w.week_label,
    saved: Math.round(w.saved),
    near_miss: Math.round(w.near_miss),
    wasted: Math.round(w.wasted),
  }));

  const totalSaved = Math.round(data?.total_saved_7d ?? 0);

  return (
    <div className="card p-4 sm:p-5">
      <div className="font-mono text-[11px] uppercase tracking-widest text-subtle mb-1">
        Weekly savings · BDT
      </div>
      <div className="font-head text-2xl sm:text-3xl text-green-400 mb-0.5">
        ৳{totalSaved.toLocaleString()}
      </div>
      <div className="font-mono text-[10px] text-subtle mb-5">
        saved this week via zero-waste cooking
        {isLoading && ' · loading…'}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="week"
            tick={{ fill: '#6b736b', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b736b', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `৳${v}`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#6b736b' }}
          />
          <Bar dataKey="saved"     name="Saved"     fill="#4ade80" radius={[3, 3, 0, 0]} />
          <Bar dataKey="near_miss" name="Near-miss" fill="#fbbf24" radius={[3, 3, 0, 0]} />
          <Bar dataKey="wasted"    name="Wasted"    fill="#f87171" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
