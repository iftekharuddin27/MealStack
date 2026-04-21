// ============================================================
// MealStack · RecipeFeed Component
// Shows matched and unmatched recipes using Subset Matcher.
// ============================================================

'use client';

import { useInventory } from '@/hooks/useInventory';
import { useRecipeMatch } from '@/hooks/useRecipeMatch';
import RecipeCard from './RecipeCard';

export default function RecipeFeed() {
  const { data: inventory = [], isLoading: invLoading } = useInventory();
  const { result, isLoading: recipesLoading, error } = useRecipeMatch(inventory);

  const isLoading = invLoading || recipesLoading;

  if (isLoading) {
    return (
      <div className="font-mono text-xs text-subtle animate-pulse text-center py-16">
        Running Subset Matcher…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card px-6 py-10 space-y-2">
        <div className="text-sm font-medium text-red-400">Recipes could not be loaded</div>
        <p className="text-xs text-subtle font-mono">
          {error.message}
        </p>
        <p className="text-xs text-subtle">
          Recipe matching requires recipe data from the database. If migrations/seed are not applied,
          the feed will stay empty.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Matched recipes */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
            Matched recipes
          </span>
          <span className="font-mono text-[11px] text-teal-400">
            {result?.matched.length ?? 0} available
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {result?.matched.length === 0 ? (
          <div className="card px-6 py-10 text-center text-sm text-subtle">
            No recipes match your current inventory. Try restocking some basics.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            {result?.matched.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                inventory={inventory}
                cookable={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Unmatched recipes */}
      {result && result.unmatched.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
              Missing ingredients · Needs shopping
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            {result.unmatched.map(({ recipe, missing }) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                inventory={inventory}
                cookable={false}
                missingIngredients={missing.map((m) => m.name)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
