// ============================================================
// MealStack · WasteDonut Component
// Donut chart — savings breakdown by food category.
// ============================================================

'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const CATEGORY_COLORS: Record<string, string> = {
  grain:   '#4ade80',
  dairy:   '#fbbf24',
  protein: '#2dd4bf',
  veg:     '#a3e635',
  spice:   '#c084fc',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 font-mono text-xs">
      <span style={{ color: d.payload.fill }}>{d.name}</span>
      <span className="ml-2 text-foreground">৳{d.value}</span>
    </div>
  );
};

export default function WasteDonut() {
  const { data, isLoading } = useAnalytics();

  const chartData = (data?.savings_by_category ?? []).map((d) => ({
    name: d.category.charAt(0).toUpperCase() + d.category.slice(1),
    value: Math.round(d.total_saved),
    fill: CATEGORY_COLORS[d.category] ?? '#6b736b',
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card p-4 sm:p-5">
      <div className="font-mono text-[11px] uppercase tracking-widest text-subtle mb-5">
        Savings by category{isLoading && ' · loading…'}
      </div>

      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
        {chartData.length === 0 ? (
          <div className="w-full text-sm text-subtle border border-border rounded-lg px-3 py-4 bg-background-3">
            No cooked history yet. Cook a recipe to start tracking savings by category.
          </div>
        ) : (
          <>
            {/* Donut */}
            <div className="relative w-32 h-32 mx-auto sm:mx-0 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={56}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centre label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-head text-sm text-foreground">৳{(total / 1000).toFixed(1)}K</div>
                <div className="font-mono text-[8px] text-subtle uppercase tracking-widest">Saved</div>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full flex-1 space-y-2">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: d.fill }}
                  />
                  <span className="text-muted-foreground flex-1">{d.name}</span>
                  <span className="font-mono text-foreground">৳{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
