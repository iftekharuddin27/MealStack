// ============================================================
// MealStack · RecipeCard Component
// Displays a single recipe with ingredients and cook button.
// ============================================================

'use client';

import { useState } from 'react';
import CookModal from './CookModal';
import type { Recipe, InventoryItemFlat } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  inventory: InventoryItemFlat[];
  cookable?: boolean;
  missingIngredients?: string[];
}

const THUMB_GRADIENTS: Record<string, string> = {
  '🍳': 'from-yellow-950 to-amber-950',
  '🍝': 'from-orange-950 to-red-950',
  '🥣': 'from-amber-950 to-yellow-950',
  '🍚': 'from-green-950 to-teal-950',
  '🥬': 'from-green-950 to-emerald-950',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   'text-green-400',
  medium: 'text-amber-400',
  hard:   'text-red-400',
};

export default function RecipeCard({
  recipe,
  inventory,
  cookable = true,
  missingIngredients = [],
}: RecipeCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const gradient = THUMB_GRADIENTS[recipe.emoji] ?? 'from-surface to-background-3';

  return (
    <>
      <div
        className={`card overflow-hidden transition-all duration-200 ${
          cookable
            ? 'hover:border-accent/60 hover:-translate-y-0.5 cursor-pointer'
            : 'opacity-60 cursor-not-allowed'
        }`}
        onClick={() => cookable && setModalOpen(true)}
      >
        {/* Thumbnail */}
        <div
          className={`h-24 sm:h-28 flex items-center justify-center text-4xl sm:text-5xl bg-gradient-to-br ${gradient}`}
        >
          {recipe.emoji}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="font-semibold text-[14px]">{recipe.name}</div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 sm:gap-3 font-mono text-[10px] text-subtle">
            <span>⏱ {recipe.time_minutes} min</span>
            <span>👤 {recipe.servings}</span>
            <span className={DIFFICULTY_COLOR[recipe.difficulty]}>
              ⚡ {recipe.difficulty}
            </span>
          </div>

          {/* Ingredient tags */}
          <div className="flex flex-wrap gap-1.5">
            {recipe.recipe_ingredients.map((ri) => {
              const isMissing = missingIngredients.includes(ri.ingredient.name);
              return (
                <span
                  key={ri.id}
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-md border ${
                    isMissing
                      ? 'bg-red-950 text-red-400 border-red-900'
                      : 'bg-background-3 text-subtle border-border'
                  }`}
                >
                  {ri.ingredient.name}
                </span>
              );
            })}
          </div>

          {/* Action */}
          {cookable ? (
            <button
              onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
              className="w-full bg-accent hover:bg-accent-hover text-background font-bold text-[12px] py-2.5 rounded-lg transition tracking-wide"
            >
              Mark as Cooked → Auto-Deduct
            </button>
          ) : (
            <div className="w-full py-2.5 text-center font-mono text-[10px] text-subtle">
              {missingIngredients.length > 0
                ? `Missing: ${missingIngredients.slice(0, 2).join(', ')}${missingIngredients.length > 2 ? '…' : ''}`
                : 'Ingredients unavailable'}
            </div>
          )}
        </div>
      </div>

      {/* Cook Modal */}
      {modalOpen && (
        <CookModal
          recipe={recipe}
          inventory={inventory}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
