'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const COLORS: Record<string, string> = {
  grain: '#4ade80', dairy: '#fbbf24', protein: '#2dd4bf', veg: '#a3e635', spice: '#c084fc',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs">
      <span style={{ color: item.payload.fill }}>{item.name}</span>
      <span className="ml-2">৳{item.value}</span>
    </div>
  );
}

export default function WasteDonut() {
  const { data, isLoading } = useAnalytics();
  const chartData = (data?.rescued_by_category ?? []).map((item) => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: Math.round(item.rescued_value),
    fill: COLORS[item.category] ?? '#9fa89f',
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Rescued value by category{isLoading && ' · loading…'}
      </div>
      {chartData.length === 0 ? (
        <div className="rounded-lg border border-border bg-background-3 px-3 py-4 text-sm text-muted-foreground">
          No at-risk food has been consumed yet. Tracked outcomes will appear here.
        </div>
      ) : (
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative mx-auto h-32 w-32 flex-shrink-0 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" strokeWidth={0}>
                  {chartData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-head text-sm">৳{total.toLocaleString()}</div>
              <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Rescued</div>
            </div>
          </div>
          <div className="w-full flex-1 space-y-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full" style={{ background: item.fill }} />
                <span className="flex-1 text-muted-foreground">{item.name}</span>
                <span className="font-mono">৳{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
