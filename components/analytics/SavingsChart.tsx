'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-3 font-mono text-xs shadow-xl">
      <div className="mb-2 text-muted-foreground">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex justify-between gap-3">
          <span style={{ color: entry.fill }}>{entry.name}</span>
          <span>৳{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function SavingsChart() {
  const { data, isLoading } = useAnalytics();
  const chartData = (data?.weekly_trend ?? []).map((week) => ({
    week: week.week_label,
    rescued: Math.round(week.rescued),
    donated: Math.round(week.donated),
    wasted: Math.round(week.wasted),
  }));

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Tracked food outcomes · BDT
      </div>
      <div className="font-head text-2xl text-green-400 sm:text-3xl">
        ৳{Math.round(data?.rescued_value_7d ?? 0).toLocaleString()}
      </div>
      <div className="mb-5 font-mono text-[10px] text-muted-foreground">
        at-risk ingredient value rescued this week{isLoading && ' · loading…'}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: '#9fa89f', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#9fa89f', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `৳${value}`} width={48} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend wrapperStyle={{ fontSize: 10, color: '#9fa89f' }} />
          <Bar dataKey="rescued" name="Rescued" fill="#4ade80" radius={[3, 3, 0, 0]} />
          <Bar dataKey="donated" name="Donated" fill="#2dd4bf" radius={[3, 3, 0, 0]} />
          <Bar dataKey="wasted" name="Wasted" fill="#f87171" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
