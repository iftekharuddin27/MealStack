'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function WeeklyTrend() {
  const { data } = useAnalytics();
  const chartData = (data?.weekly_trend ?? []).map((week) => ({
    week: week.week_label,
    rescued: Math.round(week.rescued),
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          At-risk value rescued · BDT per week
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="card p-4 sm:p-5">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: '#9fa89f', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9fa89f', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `৳${value}`} width={48} />
            <Tooltip formatter={(value) => [`৳${value}`, 'Rescued']} />
            <Line type="monotone" dataKey="rescued" stroke="#2dd4bf" strokeWidth={2} dot={{ fill: '#2dd4bf', r: 4, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
