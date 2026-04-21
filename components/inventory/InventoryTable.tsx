// ============================================================
// MealStack · InventoryTable Component
// Displays all inventory items with expiry status and delete.
// ============================================================

'use client';

import { useInventory, useRemoveInventoryItem } from '@/hooks/useInventory';
import ExpiryBadge from './ExpiryBadge';
import type { Category } from '@/types';

const CAT_BADGE: Record<Category, string> = {
  dairy:   'bg-blue-950 text-blue-400 border-blue-900',
  grain:   'bg-orange-950 text-orange-400 border-orange-900',
  protein: 'bg-green-950 text-green-400 border-green-900',
  veg:     'bg-emerald-950 text-emerald-400 border-emerald-900',
  spice:   'bg-purple-950 text-purple-400 border-purple-900',
};

export default function InventoryTable() {
  const { data: inventory = [], isLoading } = useInventory();
  const removeItem = useRemoveInventoryItem();

  if (isLoading) {
    return (
      <div className="font-mono text-xs text-subtle animate-pulse py-8 text-center">
        Loading inventory…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
          Current stock
        </span>
        <span className="font-mono text-[11px] text-green-400">{inventory.length} items</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              {['Ingredient', 'Qty', 'Category', 'Expires', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-subtle border-b border-border"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-subtle">
                  Your fridge is empty. Add some items above.
                </td>
              </tr>
            ) : (
              inventory.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`hover:bg-surface transition ${
                    idx < inventory.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-[13px]">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {item.qty}{item.unit}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                        CAT_BADGE[item.category]
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryBadge expiresAt={item.expires_at} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryBadge expiresAt={item.expires_at} showDot />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeItem.mutate(item.id)}
                      disabled={removeItem.isPending}
                      className="font-mono text-[11px] text-subtle hover:text-red-400 border border-border hover:border-red-900 rounded px-2.5 py-1 transition"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {inventory.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-subtle">
            Your fridge is empty. Add some items above.
          </div>
        ) : (
          inventory.map((item) => (
            <div key={item.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-[14px] break-words">{item.name}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-1">
                    {item.qty}{item.unit}
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded border whitespace-nowrap ${
                    CAT_BADGE[item.category]
                  }`}
                >
                  {item.category}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <ExpiryBadge expiresAt={item.expires_at} />
                <ExpiryBadge expiresAt={item.expires_at} showDot />
              </div>

              <button
                onClick={() => removeItem.mutate(item.id)}
                disabled={removeItem.isPending}
                className="w-full font-mono text-[11px] text-subtle hover:text-red-400 border border-border hover:border-red-900 rounded px-2.5 py-2 transition"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
