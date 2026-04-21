// ============================================================
// MealStack · useRecipeMatch Hook
// Fetches all recipes + runs subsetMatcher client-side,
// re-running automatically whenever inventory changes.
// ============================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { subsetMatcher, type MatchResult } from '@/lib/subsetMatcher';
import { LOCAL_RECIPES } from '@/lib/localRecipes';
import type { InventoryItemFlat, Recipe } from '@/types';

async function fetchAllRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients (
        id, quantity, unit, quantity_base,
        ingredient:ingredients ( id, name, category, default_unit, price_per_unit )
      )
    `)
    .order('name');

  if (error) {
    // Fallback mode for local/dev when DB migrations are not applied yet.
    if ((error as any).code === 'PGRST205' || error.message?.includes('public.recipes')) {
      return LOCAL_RECIPES;
    }
    throw error;
  }

  if (!data || data.length === 0) {
    return LOCAL_RECIPES;
  }

  return (data ?? []) as Recipe[];
}

export function useRecipeMatch(inventory: InventoryItemFlat[]): {
  result: MatchResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: recipes, isLoading, error } = useQuery({
    queryKey: ['recipes'],
    queryFn: fetchAllRecipes,
    staleTime: 5 * 60_000, // recipes don't change often
  });

  const result: MatchResult | undefined = recipes
    ? subsetMatcher(recipes, inventory)
    : undefined;

  return { result, isLoading, error: error as Error | null };
}
