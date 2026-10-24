'use client';

import { useState } from 'react';
import CookModal from './CookModal';
import { useAddShoppingItems } from '@/hooks/useShoppingList';
import type { MissingIngredient } from '@/lib/subsetMatcher';
import type { InventoryItemFlat, Recipe } from '@/types';

interface Props {
  recipe: Recipe;
  inventory: InventoryItemFlat[];
  cookable?: boolean;
  missingIngredients?: MissingIngredient[];
  availableRatio?: number;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400', medium: 'text-amber-400', hard: 'text-red-400',
};

export default function RecipeCard({
  recipe,
  inventory,
  cookable = true,
  missingIngredients = [],
  availableRatio = 1,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [shoppingMessage, setShoppingMessage] = useState('');
  const addShoppingItems = useAddShoppingItems();

  async function addMissingToShoppingList() {
    try {
      await addShoppingItems.mutateAsync(missingIngredients.map((item) => ({
        ingredient_id: /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.ingredient_id)
          ? item.ingredient_id
          : undefined,
        ingredient_name: item.name,
        quantity_base: item.shortfall,
        unit: item.base_unit,
      })));
      setShoppingMessage('Added missing quantities to your shopping list.');
    } catch (error) {
      setShoppingMessage(error instanceof Error ? error.message : 'Could not update shopping list.');
    }
  }

  return (
    <article className="card overflow-hidden transition-colors hover:border-border-2">
      <div className={`flex h-24 items-center justify-center bg-gradient-to-br text-5xl ${cookable ? 'from-green-950 to-teal-950' : 'from-background-3 to-surface'}`} aria-hidden="true">{recipe.emoji}</div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold">{recipe.name}</h3>
          {!cookable && <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{Math.round(availableRatio * 100)}% covered</span>}
        </div>
        <div className="flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
          <span>Time: {recipe.time_minutes} min</span>
          <span>Serves {recipe.servings}</span>
          <span className={DIFFICULTY_COLOR[recipe.difficulty]}>Difficulty: {recipe.difficulty}</span>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Ingredients">
          {recipe.recipe_ingredients.map((ingredient) => {
            const missing = missingIngredients.find((item) => item.ingredient_id === ingredient.ingredient_id);
            return <li key={ingredient.id} className={`rounded-md border px-2 py-0.5 font-mono text-[10px] ${missing ? 'border-red-900 bg-red-950 text-red-300' : 'border-border bg-background-3 text-muted-foreground'}`}>{ingredient.ingredient.name}</li>;
          })}
        </ul>

        {cookable ? (
          <button onClick={() => setModalOpen(true)} className="w-full rounded-lg bg-accent py-2.5 text-[12px] font-bold tracking-wide text-background transition hover:bg-accent-hover">Cook recipe · FIFO deduction</button>
        ) : (
          <div className="space-y-2">
            <ul className="space-y-1 text-xs text-red-300">
              {missingIngredients.map((item) => (
                <li key={item.ingredient_id}>
                  {item.reason === 'incompatible_unit'
                    ? `${item.name}: inventory uses an incompatible unit`
                    : `${item.name}: need ${Math.round(item.shortfall * 100) / 100}${item.base_unit} more`}
                </li>
              ))}
            </ul>
            <button onClick={addMissingToShoppingList} disabled={addShoppingItems.isPending} className="w-full rounded-lg border border-accent/60 py-2.5 text-xs font-medium text-accent hover:bg-green-950/30 disabled:opacity-60">{addShoppingItems.isPending ? 'Adding…' : 'Add missing items to shopping list'}</button>
            {shoppingMessage && <p role="status" className="text-xs text-muted-foreground">{shoppingMessage}</p>}
          </div>
        )}
      </div>
      {modalOpen && <CookModal recipe={recipe} inventory={inventory} onClose={() => setModalOpen(false)} />}
    </article>
  );
}
