'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { previewDeduction } from '@/lib/subsetMatcher';
import { ingredientNamesMatch } from '@/lib/ingredientAliases';
import { areUnitsCompatible, toBase } from '@/lib/unitNormalizer';
import { getRecipeInstructions } from '@/lib/recipeInstructions';
import { supabase } from '@/lib/supabase/client';
import { readInventoryFallback, writeInventoryFallback } from '@/lib/offlineInventoryStore';
import { appendCookHistoryFallback } from '@/lib/offlineCookHistoryStore';
import { DEMO_FALLBACK_ENABLED } from '@/lib/demoMode';
import type { InventoryItemFlat, Recipe } from '@/types';

interface Props {
  recipe: Recipe;
  inventory: InventoryItemFlat[];
  onClose: () => void;
}

export default function CookModal({ recipe, inventory, onClose }: Props) {
  const queryClient = useQueryClient();
  const [servings, setServings] = useState(Math.max(recipe.servings, 1));
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const preview = useMemo(() => previewDeduction(recipe, inventory, servings), [recipe, inventory, servings]);
  const instructions = getRecipeInstructions(recipe);
  const referenceOnly = recipe.source === 'themealdb' || recipe.source === 'curated' || recipe.source === 'personal';
  const servingMultiplier = servings / Math.max(recipe.servings, 1);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  function applyDemoDeduction(userId: string) {
    const multiplier = servings / Math.max(recipe.servings, 1);
    const items = [...readInventoryFallback(userId)].sort(
      (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    );
    for (const recipeIngredient of recipe.recipe_ingredients) {
      let required = toBase(recipeIngredient.quantity, recipeIngredient.unit) * multiplier;
      for (const item of items) {
        if (required <= 0) break;
        if (new Date(item.expires_at) <= new Date()) continue;
        if (!ingredientNamesMatch(item.name, recipeIngredient.ingredient.name)) continue;
        if (!areUnitsCompatible(item.unit, recipeIngredient.unit)) continue;
        const take = Math.min(required, item.quantity_base);
        const nextBase = item.quantity_base - take;
        const factor = toBase(1, item.unit);
        item.quantity_base = nextBase;
        item.qty = Math.round((nextBase / factor) * 1000) / 1000;
        required -= take;
      }
    }
    writeInventoryFallback(userId, items.filter((item) => item.quantity_base > 0));
  }

  const confirmCook = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired. Please sign in again.');
      const res = await fetch('/api/inventory/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id, servings }),
      });

      if (!res.ok) {
        if (DEMO_FALLBACK_ENABLED && res.status >= 500) {
          applyDemoDeduction(user.id);
          appendCookHistoryFallback(user.id, {
            id: `demo-cook-${crypto.randomUUID()}`,
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            cooked_at: new Date().toISOString(),
          });
          return { demoFallback: true };
        }
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Cooking transaction failed. No inventory was changed.');
      }
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-cooked'] }),
      ]);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cook-title" aria-describedby="cook-description" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="cook-title" className="font-head text-xl">Cook {recipe.name}</h2>
            <p id="cook-description" className="mt-1 text-xs text-muted-foreground">
              {referenceOnly
                ? 'Recipe quantities are normalized and compared with your current inventory.'
                : 'Inventory is validated, locked, and deducted earliest-expiry-first in one transaction.'}
            </p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close cooking dialog" className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground">×</button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background-3 p-3">
          <label htmlFor={`servings-${recipe.id}`} className="text-sm text-muted-foreground">Servings</label>
          <input id={`servings-${recipe.id}`} type="number" min="1" max="100" step="1" value={servings} onChange={(event) => setServings(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} className="w-20 rounded border border-border bg-background px-2 py-1 text-sm" />
          <span className="text-xs text-muted-foreground">Base recipe: {recipe.servings}</span>
        </div>

        <section className="mt-5" aria-labelledby={`instructions-${recipe.id}`}>
          <h3 id={`instructions-${recipe.id}`} className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Instructions</h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">{instructions.map((step, index) => <li key={index}>{step}</li>)}</ol>
        </section>

        {referenceOnly ? (
          <section className="my-5" aria-labelledby={`ingredients-${recipe.id}`}>
            <h3 id={`ingredients-${recipe.id}`} className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Ingredients</h3>
            <div className="grid gap-2 sm:grid-cols-2">{recipe.recipe_ingredients.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background-3 px-3 py-2.5 text-xs">
                <span>{item.ingredient.name}{item.optional ? ' (optional)' : ''}</span>
                <span className="font-mono text-muted-foreground">
                  {servings === recipe.servings && item.original_measure
                    ? item.original_measure
                    : `${Math.round(item.quantity * servingMultiplier * 100) / 100}${item.unit}`}
                </span>
              </div>
            ))}</div>
          </section>
        ) : (
          <section className="my-5" aria-labelledby={`deduction-${recipe.id}`}>
            <h3 id={`deduction-${recipe.id}`} className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Deduction preview</h3>
            <div className="space-y-2">{preview.map((item) => (
              <div key={item.ingredient_name} className="flex items-center gap-3 rounded-lg border border-border bg-background-3 px-3 py-2.5 font-mono text-xs">
                <span className="flex-1">{item.ingredient_name}</span>
                <span className="text-muted-foreground">−{item.deduct_qty}{item.deduct_unit}</span>
                <span className={item.used_up ? 'text-red-400' : 'text-green-400'}>{item.used_up ? 'Used up' : `${item.after_display} left`}</span>
              </div>
            ))}</div>
          </section>
        )}

        {confirmCook.error && <p role="alert" className="mb-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{confirmCook.error.message}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted-foreground">Close</button>
          {referenceOnly && recipe.source_url ? (
            <a href={recipe.source_url ?? 'https://www.themealdb.com'} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-accent py-2.5 text-center text-sm font-bold text-background">
              Open original recipe
            </a>
          ) : !referenceOnly ? (
            <button onClick={() => confirmCook.mutate()} disabled={confirmCook.isPending} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-bold text-background disabled:opacity-60">{confirmCook.isPending ? 'Committing transaction…' : 'Confirm and deduct'}</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
