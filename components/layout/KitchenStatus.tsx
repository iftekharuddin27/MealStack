// ============================================================
// MealStack · KitchenStatus — Dashboard Client Component
// Shows stat cards, expiry watch, and matched recipes.
// ============================================================

'use client';

import { useInventory } from '@/hooks/useInventory';
import { useRecipeMatch } from '@/hooks/useRecipeMatch';
import { getExpiryInfo, getExpiryStatus, EXPIRY_COLORS } from '@/lib/expiryLogic';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { InventoryItemFlat } from '@/types';

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  delta,
  color,
}: {
  label: string;
  value: string | number;
  delta: React.ReactNode;
  color: 'green' | 'amber' | 'red' | 'teal';
}) {
  const textColor = {
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    teal: 'text-teal-400',
  }[color];

  return (
    <div className="card p-4 sm:p-5 relative overflow-hidden">
      <div className="font-mono text-[10px] uppercase tracking-widest text-subtle mb-2">
        {label}
      </div>
      <div className={`font-head text-3xl sm:text-4xl tracking-tight ${textColor}`}>{value}</div>
      <div className="mt-1 text-xs text-subtle">{delta}</div>
    </div>
  );
}

// ── Expiry Item ───────────────────────────────────────────────

function ExpiryItem({ item }: { item: InventoryItemFlat }) {
  const info = getExpiryInfo(item.expires_at);
  const colors = EXPIRY_COLORS[info.status];

  return (
    <div className="card flex items-center gap-3 px-4 py-3 hover:border-border-2 transition">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium truncate">{item.name}</span>
      </div>
      <span className="font-mono text-xs text-subtle">
        {item.qty}{item.unit}
      </span>
      <span
        className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${colors.badge}`}
      >
        {info.label}
      </span>
    </div>
  );
}

// ── KitchenStatus ─────────────────────────────────────────────

export default function KitchenStatus() {
  const { data: inventory = [], isLoading } = useInventory();
  const { result } = useRecipeMatch(inventory);

  const expiring = [...inventory]
    .filter((i) => getExpiryStatus(i.expires_at) !== 'ok')
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

  const critical = expiring.filter((i) => getExpiryStatus(i.expires_at) === 'critical');

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-border bg-background-2 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="font-head text-2xl sm:text-3xl tracking-tight">
          Kitchen <em className="text-accent not-italic">Status</em>
        </h1>
        <p className="mt-1 font-mono text-xs text-subtle">
          Real-time inventory intelligence · Subset Matcher active
        </p>
      </div>

      <div className="p-4 space-y-6 sm:p-6 sm:space-y-8 lg:p-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Items in stock"
            value={inventory.length}
            delta={<><span className="text-green-400 font-medium">5</span> categories</>}
            color="green"
          />
          <StatCard
            label="Expiring soon"
            value={expiring.length}
            delta={<><span className="text-red-400 font-medium">{critical.length}</span> critical · {expiring.length - critical.length} warning</>}
            color="amber"
          />
          <StatCard
            label="Cookable now"
            value={result?.matched.length ?? '—'}
            delta="Matched by Subset Matcher"
            color="teal"
          />
          <StatCard
            label="Est. money saved"
            value="৳ 2,840"
            delta={<><span className="text-green-400 font-medium">+12%</span> vs last month</>}
            color="red"
          />
        </div>

        {/* Expiry watch */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
              Expiry Watch · Sorted by urgency
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {isLoading ? (
            <div className="font-mono text-xs text-subtle animate-pulse">Loading inventory…</div>
          ) : expiring.length === 0 ? (
            <div className="card px-4 py-6 text-center text-sm text-subtle">
              All items are fresh. Great job! 🥬
            </div>
          ) : (
            <div className="grid gap-2">
              {expiring.slice(0, 6).map((item) => (
                <ExpiryItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Quick recipe match */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
              Quick Recipe Match
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {result?.matched && result.matched.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {result.matched.slice(0, 2).map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} inventory={inventory} />
              ))}
            </div>
          ) : (
            <div className="card px-4 py-6 text-center text-sm text-subtle">
              {isLoading ? 'Finding recipes…' : 'Restock your fridge to unlock recipes.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
