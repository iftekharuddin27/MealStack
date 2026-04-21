'use client';

import { useWeeklyCooked } from '@/hooks/useWeeklyCooked';

export default function WeeklyCookedList() {
  const { data, isLoading } = useWeeklyCooked();

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
          Cooked this week
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
        <div className="bg-background-3 border border-border rounded-lg px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-subtle">Total cooks</div>
          <div className="font-head text-2xl text-teal-400">{isLoading ? '—' : data?.total_cooks ?? 0}</div>
        </div>
        <div className="bg-background-3 border border-border rounded-lg px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-subtle">Unique recipes</div>
          <div className="font-head text-2xl text-green-400">{isLoading ? '—' : data?.unique_recipes ?? 0}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs font-mono text-subtle animate-pulse">Loading weekly cooking history…</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-sm text-subtle">No recipes cooked this week yet.</div>
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => (
            <div key={item.recipe_name} className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2 bg-background-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{item.recipe_name}</div>
                <div className="text-[11px] font-mono text-subtle truncate">
                  Last cooked: {new Date(item.last_cooked_at).toLocaleString()}
                </div>
              </div>
              <div className="font-mono text-xs text-accent">x{item.times}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
