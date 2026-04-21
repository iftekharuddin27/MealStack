// ============================================================
// MealStack · CookModal Component
// Confirms recipe cooking and triggers auto-deduction.
// Shows a preview of what inventory will look like after.
// ============================================================

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { previewDeduction } from '@/lib/subsetMatcher';
import { ingredientNamesMatch } from '@/lib/ingredientAliases';
import { getRecipeInstructions } from '@/lib/recipeInstructions';
import { supabase } from '@/lib/supabase/client';
import { readInventoryFallback, writeInventoryFallback } from '@/lib/offlineInventoryStore';
import { appendCookHistoryFallback } from '@/lib/offlineCookHistoryStore';
import type { Recipe, InventoryItemFlat } from '@/types';

interface CookModalProps {
  recipe: Recipe;
  inventory: InventoryItemFlat[];
  onClose: () => void;
}

export default function CookModal({ recipe, inventory, onClose }: CookModalProps) {
  const queryClient = useQueryClient();
  const preview = previewDeduction(recipe, inventory);
  const instructions = getRecipeInstructions(recipe);

  function applyLocalDeduction(userId: string) {
    const items = readInventoryFallback(userId);

    const updated = items
      .map((item) => {
        const ingredient = recipe.recipe_ingredients.find((ri) =>
          ingredientNamesMatch(ri.ingredient.name, item.name)
        );

        if (!ingredient) return item;

        const nextBase = Math.max(0, (item.quantity_base ?? 0) - ingredient.quantity_base);
        const factor = item.quantity > 0 ? (item.quantity_base / item.quantity) : 1;
        const nextQty = factor > 0 ? Math.round((nextBase / factor) * 1000) / 1000 : 0;

        return {
          ...item,
          qty: nextQty,
          quantity_base: nextBase,
        };
      })
      .filter((item) => item.quantity_base > 0);

    writeInventoryFallback(userId, updated);
  }

  const confirmCook = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired. Please sign in again.');

      const res = await fetch('/api/inventory/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id }),
      });

      if (!res.ok) {
        // Keep cook flow usable when backend tables are unavailable.
        applyLocalDeduction(user.id);
        appendCookHistoryFallback(user.id, {
          id: `local-cook-${Date.now()}`,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          cooked_at: new Date().toISOString(),
        });
        return { fallback: true };
      }

      const payload = await res.json();

      // Mirror history locally so weekly list is still instant across ports.
      appendCookHistoryFallback(user.id, {
        id: `sync-cook-${Date.now()}`,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        cooked_at: new Date().toISOString(),
      });

      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-cooked'] });
      onClose();
    },
  });

  return (
    /* Overlay */
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border rounded-2xl p-7 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="mb-1">
          <div className="font-head text-xl">Cook: {recipe.name}?</div>
          <div className="font-mono text-xs text-subtle mt-1">
            Auto-deduction will update UserInventory in Supabase
          </div>
        </div>

        {/* How to cook */}
        <div className="mt-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-subtle mb-2">
            How to make
          </div>
          <ol className="space-y-1.5 list-decimal pl-4 text-sm text-foreground">
            {instructions.map((step, index) => (
              <li key={`${recipe.id}-step-${index}`}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Ingredient deduction preview */}
        <div className="my-5 space-y-2">
          {preview.map((p) => (
            <div
              key={p.ingredient_name}
              className="flex items-center gap-3 px-3 py-2.5 bg-background-3 rounded-lg border border-border font-mono text-xs"
            >
              <span className="flex-1 text-foreground">{p.ingredient_name}</span>
              <span className="text-subtle">
                {p.deduct_qty}{p.deduct_unit}
              </span>
              <span className={p.used_up ? 'text-red-400' : 'text-green-400'}>
                → {p.used_up ? 'used up' : p.after_display + ' left'}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        {confirmCook.isError && (
          <p className="text-xs text-red-400 font-mono bg-red-950/50 border border-red-900 rounded-lg px-3 py-2 mb-4">
            Something went wrong. Please try again.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-transparent border border-border text-muted-foreground rounded-lg text-sm hover:border-border-2 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => confirmCook.mutate()}
            disabled={confirmCook.isPending}
            className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-background font-bold text-sm rounded-lg transition disabled:opacity-60"
          >
            {confirmCook.isPending ? 'Updating…' : '✓ Confirm & Deduct'}
          </button>
        </div>
      </div>
    </div>
  );
}
