// ============================================================
// MealStack · WeeklyTrend Component
// Line chart — weekly savings trend over the past 5 weeks.
// ============================================================

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 font-mono text-xs">
      <div className="text-subtle mb-1">{label}</div>
      <div className="text-teal-400">৳{payload[0]?.value} saved</div>
    </div>
  );
};

export default function WeeklyTrend() {
  const { data } = useAnalytics();

  const chartData = (data?.weekly_trend ?? []).map((w) => ({
    week: w.week_label,
    saved: Math.round(w.saved),
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
          Weekly savings trend · BDT per week
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="card p-4 sm:p-5">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(45,212,191,0.2)' }} />
            <Line
              type="monotone"
              dataKey="saved"
              stroke="#2dd4bf"
              strokeWidth={2}
              dot={{ fill: '#2dd4bf', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#2dd4bf', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
