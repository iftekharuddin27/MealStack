'use client';

import { useMemo, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useRecipeMatch } from '@/hooks/useRecipeMatch';
import RecipeCard from './RecipeCard';

export default function RecipeFeed() {
  const { data: inventory = [], isLoading: inventoryLoading, error: inventoryError } = useInventory();
  const { result, isLoading: recipeLoading, error: recipeError } = useRecipeMatch(inventory);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'cookable' | 'closest'>('all');

  const normalizedQuery = query.trim().toLowerCase();
  const matched = useMemo(() => (result?.matched ?? []).filter((recipe) =>
    recipe.name.toLowerCase().includes(normalizedQuery)
    || recipe.recipe_ingredients.some((item) => item.ingredient.name.toLowerCase().includes(normalizedQuery))
  ), [result, normalizedQuery]);
  const unmatched = useMemo(() => (result?.unmatched ?? []).filter(({ recipe }) =>
    recipe.name.toLowerCase().includes(normalizedQuery)
    || recipe.recipe_ingredients.some((item) => item.ingredient.name.toLowerCase().includes(normalizedQuery))
  ), [result, normalizedQuery]);

  if (inventoryLoading || recipeLoading) {
    return <div className="py-16 text-center font-mono text-xs text-muted-foreground" aria-live="polite">Matching recipes to non-expired inventory…</div>;
  }
  const error = inventoryError ?? recipeError;
  if (error) return <div role="alert" className="card border-red-900 px-6 py-10 text-sm text-red-300">Recipes could not be loaded: {error.message}</div>;

  return (
    <div className="space-y-8">
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label htmlFor="recipe-search" className="sr-only">Search recipes or ingredients</label>
        <input id="recipe-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recipes or ingredients…" className="min-w-0 flex-1 rounded-lg border border-border bg-background-3 px-3 py-2 text-sm outline-none focus:border-accent" />
        <div className="flex gap-2" role="group" aria-label="Recipe view">
          {(['all', 'cookable', 'closest'] as const).map((option) => (
            <button key={option} onClick={() => setView(option)} aria-pressed={view === option} className={`rounded-lg border px-3 py-2 text-xs capitalize ${view === option ? 'border-accent bg-green-950/40 text-accent' : 'border-border text-muted-foreground'}`}>
              {option}
            </button>
          ))}
        </div>
      </div>

      {view !== 'closest' && (
        <section aria-labelledby="matched-title">
          <div className="mb-5 flex items-center gap-3">
            <h2 id="matched-title" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Cookable now · expiry-prioritized</h2>
            <span className="font-mono text-[11px] text-teal-400">{matched.length} available</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {matched.length === 0 ? (
            <div className="card px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No recipes match your non-expired inventory.</p>
              <a href="/inventory" className="mt-3 inline-block rounded-lg border border-accent px-3 py-2 text-xs text-accent">Add inventory</a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{matched.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} inventory={inventory} cookable />)}</div>
          )}
        </section>
      )}

      {view !== 'cookable' && unmatched.length > 0 && (
        <section aria-labelledby="closest-title">
          <div className="mb-5 flex items-center gap-3">
            <h2 id="closest-title" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Closest matches · best coverage first</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {unmatched.map(({ recipe, missing, availableRatio }) => (
              <RecipeCard key={recipe.id} recipe={recipe} inventory={inventory} cookable={false} missingIngredients={missing} availableRatio={availableRatio} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
