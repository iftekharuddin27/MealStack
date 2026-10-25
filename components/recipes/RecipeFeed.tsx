'use client';

import { useMemo, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useDeletePersonalRecipe, usePersonalRecipes } from '@/hooks/usePersonalRecipes';
import { useExternalRecipes } from '@/hooks/useRecipeCatalog';
import { useRecipeMatch } from '@/hooks/useRecipeMatch';
import { subsetMatcher, type MissingIngredient } from '@/lib/subsetMatcher';
import PersonalRecipeForm from './PersonalRecipeForm';
import RecipeCard from './RecipeCard';
import type { Recipe } from '@/types';

const CATALOG_CATEGORIES = [
  'Breakfast', 'Chicken', 'Beef', 'Lamb', 'Goat', 'Vegetarian', 'Vegan',
  'Pasta', 'Seafood', 'Side', 'Starter', 'Dessert',
] as const;

interface CatalogCard {
  recipe: Recipe;
  cookable: boolean;
  missing: MissingIngredient[];
  availableRatio: number;
}

export default function RecipeFeed() {
  const { data: inventory = [], isLoading: inventoryLoading, error: inventoryError } = useInventory();
  const { result, isLoading: recipeLoading, error: recipeError } = useRecipeMatch(inventory);
  const personalRecipes = usePersonalRecipes();
  const deletePersonal = useDeletePersonalRecipe();
  const [query, setQuery] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATALOG_CATEGORIES)[number]>('Breakfast');
  const [view, setView] = useState<'all' | 'cookable' | 'closest'>('all');
  const [personalFormOpen, setPersonalFormOpen] = useState(false);
  const externalRecipes = useExternalRecipes(catalogQuery, category);

  const savedRecipes = useMemo(() => [
    ...(result?.matched ?? []),
    ...(result?.unmatched ?? []).map(({ recipe }) => recipe),
  ], [result]);

  const catalogCards = useMemo<CatalogCard[]>(() => {
    const merged: Recipe[] = [];
    const names = new Set<string>();
    for (const recipe of [...(personalRecipes.data ?? []), ...savedRecipes, ...(externalRecipes.data ?? [])]) {
      const key = recipe.name.toLowerCase().trim();
      if (names.has(key)) continue;
      names.add(key);
      merged.push(recipe);
    }

    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? merged.filter((recipe) =>
          recipe.name.toLowerCase().includes(normalizedQuery)
          || recipe.recipe_ingredients.some((item) =>
            item.ingredient.name.toLowerCase().includes(normalizedQuery)
          ))
      : merged;
    const catalogResult = subsetMatcher(filtered, inventory);
    const cookable = catalogResult.matched.map((recipe) => ({
      recipe, cookable: true, missing: [], availableRatio: 1,
    }));
    const closest = catalogResult.unmatched.map(({ recipe, missing, availableRatio }) => ({
      recipe, cookable: false, missing, availableRatio,
    }));
    if (view === 'cookable') return cookable;
    if (view === 'closest') return closest;
    return [...cookable, ...closest];
  }, [externalRecipes.data, inventory, personalRecipes.data, query, savedRecipes, view]);

  function submitCatalogSearch(event: React.FormEvent) {
    event.preventDefault();
    setCatalogQuery(query.trim());
  }

  function chooseCategory(next: (typeof CATALOG_CATEGORIES)[number]) {
    setCategory(next);
    setQuery('');
    setCatalogQuery('');
  }

  async function removePersonalRecipe(recipe: Recipe) {
    if (!window.confirm(`Delete your personal recipe “${recipe.name}”?`)) return;
    await deletePersonal.mutateAsync(recipe.id);
  }

  if (inventoryLoading || recipeLoading || personalRecipes.isLoading) {
    return <div className="py-16 text-center font-mono text-xs text-muted-foreground" aria-live="polite">Matching recipes to non-expired inventory…</div>;
  }
  const error = inventoryError ?? recipeError ?? personalRecipes.error;
  if (error) return <div role="alert" className="card border-red-900 px-6 py-10 text-sm text-red-300">Recipes could not be loaded: {error.message}</div>;

  return (
    <div className="space-y-8">
      <form onSubmit={submitCatalogSearch} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label htmlFor="recipe-search" className="sr-only">Search recipes or ingredients</label>
        <input id="recipe-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tea, egg, rice, chicken…" className="min-w-0 flex-1 rounded-lg border border-border bg-background-3 px-3 py-2 text-sm outline-none focus:border-accent" />
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-background hover:bg-accent-hover">Search library</button>
        <div className="flex gap-2" role="group" aria-label="Recipe view">
          {(['all', 'cookable', 'closest'] as const).map((option) => (
            <button type="button" key={option} onClick={() => setView(option)} aria-pressed={view === option} className={`rounded-lg border px-3 py-2 text-xs capitalize ${view === option ? 'border-accent bg-green-950/40 text-accent' : 'border-border text-muted-foreground'}`}>
              {option}
            </button>
          ))}
        </div>
      </form>

      <section aria-labelledby="catalog-title">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h2 id="catalog-title" className="font-head text-xl">Global recipe library</h2>
            <p className="mt-1 text-xs text-muted-foreground">MealStack, personal, and worldwide recipes in one inventory-aware library.</p>
          </div>
          <span className="rounded border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">MealStack + TheMealDB</span>
          <div className="h-px min-w-12 flex-1 bg-border" />
          <button type="button" onClick={() => setPersonalFormOpen(true)} className="rounded-lg border border-accent bg-green-950/30 px-4 py-2 text-xs font-semibold text-accent hover:bg-green-950/60">+ Add personal recipe</button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Recipe categories">
          {CATALOG_CATEGORIES.map((option) => (
            <button key={option} type="button" onClick={() => chooseCategory(option)} aria-pressed={!catalogQuery && category === option} className={`rounded-full border px-3 py-1.5 text-xs ${!catalogQuery && category === option ? 'border-accent bg-green-950/40 text-accent' : 'border-border text-muted-foreground hover:border-border-2 hover:text-foreground'}`}>
              {option}
            </button>
          ))}
        </div>

        {externalRecipes.isLoading && <div className="mb-4 card py-5 text-center font-mono text-xs text-muted-foreground">Refreshing worldwide recipes…</div>}
        {externalRecipes.error && <div role="status" className="mb-4 card border-amber-900 px-5 py-4 text-sm text-amber-300">Worldwide recipes are temporarily unavailable. Saved, everyday, and personal recipes remain available.</div>}
        {catalogCards.length === 0 ? (
          <div className="card px-5 py-10 text-center text-sm text-muted-foreground">No recipes found for this search and view. Try another meal, ingredient, or category.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {catalogCards.map(({ recipe, cookable, missing, availableRatio }) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                inventory={inventory}
                cookable={cookable}
                missingIngredients={missing}
                availableRatio={availableRatio}
                onDelete={recipe.source === 'personal' ? () => removePersonalRecipe(recipe) : undefined}
              />
            ))}
          </div>
        )}
        <p className="mt-3 text-right text-[10px] text-muted-foreground">
          Worldwide recipe data and images from <a href="https://www.themealdb.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">TheMealDB</a>.
        </p>
      </section>

      <PersonalRecipeForm open={personalFormOpen} onClose={() => setPersonalFormOpen(false)} />
    </div>
  );
}
