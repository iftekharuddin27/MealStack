// ============================================================
// MealStack · InventoryForm Component
// Fast-entry form with smart expiry preview and unit dropdown.
// ============================================================

'use client';

import { useState } from 'react';
import { useAddInventoryItem } from '@/hooks/useInventory';
import { EXPIRY_DAYS } from '@/lib/expiryLogic';
import type { Category, Unit } from '@/types';

const UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup'];
const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'grain',   label: 'Grain' },
  { value: 'dairy',   label: 'Dairy' },
  { value: 'protein', label: 'Protein' },
  { value: 'veg',     label: 'Vegetable' },
  { value: 'spice',   label: 'Spice' },
];

const COMMON_INGREDIENTS: Array<{ name: string; category: Category; unit: Unit }> = [
  { name: 'Rice', category: 'grain', unit: 'g' },
  { name: 'Whole Milk', category: 'dairy', unit: 'ml' },
  { name: 'Tea Leaf', category: 'spice', unit: 'g' },
  { name: 'Sugar', category: 'spice', unit: 'g' },
  { name: 'Eggs', category: 'protein', unit: 'pcs' },
  { name: 'Olive oil', category: 'spice', unit: 'ml' },
  { name: 'Salt', category: 'spice', unit: 'g' },
  { name: 'Garlic', category: 'veg', unit: 'pcs' },
  { name: 'Butter', category: 'dairy', unit: 'g' },
  { name: 'Spaghetti', category: 'grain', unit: 'g' },
  { name: 'Chicken Breast', category: 'protein', unit: 'g' },
  { name: 'Spinach', category: 'veg', unit: 'g' },
];

const CAT_BADGE_STYLES: Record<Category, string> = {
  dairy:   'bg-blue-950 text-blue-400 border-blue-900',
  grain:   'bg-orange-950 text-orange-400 border-orange-900',
  protein: 'bg-green-950 text-green-400 border-green-900',
  veg:     'bg-emerald-950 text-emerald-400 border-emerald-900',
  spice:   'bg-purple-950 text-purple-400 border-purple-900',
};

export default function InventoryForm() {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<Unit>('g');
  const [category, setCategory] = useState<Category>('grain');
  const [toast, setToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  const addItem = useAddInventoryItem();

  const expiryDays = EXPIRY_DAYS[category];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !qty) return;

    try {
      await addItem.mutateAsync({
        ingredient_name: name.trim(),
        quantity: parseFloat(qty),
        unit,
        category,
      });

      setToast(`Added ${name.trim()} · expires in ${expiryDays} days`);
      setTimeout(() => setToast(''), 3000);
      setName('');
      setQty('');
      setErrorToast('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      setErrorToast(message);
      setTimeout(() => setErrorToast(''), 3500);
    }
  }

  const inputClass =
    'bg-background-3 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition w-full';

  return (
    <div className="card p-4 space-y-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
          Add new item
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_INGREDIENTS.slice(0, 8).map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setName(item.name);
                setCategory(item.category);
                setUnit(item.unit);
              }}
              className="font-mono text-[10px] px-2 py-1 rounded border border-border text-subtle hover:text-foreground hover:border-accent/60 transition"
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-subtle block">
              Ingredient name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basmati Rice"
              list="ingredient-suggestions"
              required
              className={inputClass}
            />
            <datalist id="ingredient-suggestions">
              {COMMON_INGREDIENTS.map((item) => (
                <option key={item.name} value={item.name} />
              ))}
            </datalist>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-subtle block">
              Quantity
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="500"
              min="0"
              step="any"
              required
              className={inputClass}
            />
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-subtle block">
              Unit
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className={inputClass}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-subtle block">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            type="submit"
            disabled={addItem.isPending}
            className="bg-accent hover:bg-accent-hover text-background font-bold text-[12px] px-5 py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {addItem.isPending ? 'Adding…' : '+ Add to Fridge'}
          </button>

          {/* Expiry preview */}
          <div className="flex items-center gap-2 text-xs text-subtle font-mono flex-wrap">
            Auto-expiry:
            <span className={`px-2 py-0.5 rounded border text-[10px] ${CAT_BADGE_STYLES[category]}`}>
              {CATEGORIES.find(c => c.value === category)?.label} → {expiryDays} days
            </span>
          </div>

          {/* Toast */}
          {toast && (
            <span className="text-xs text-green-400 font-mono animate-pulse">{toast}</span>
          )}

          {errorToast && (
            <span className="text-xs text-red-400 font-mono">{errorToast}</span>
          )}
        </div>
      </form>
    </div>
  );
}
