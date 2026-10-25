'use client';

import { useQuery } from '@tanstack/react-query';
import type { IngredientSuggestion, Recipe } from '@/types';

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null);
  return new Error(body?.error ?? fallback);
}

export function useExternalRecipes(query: string, category: string) {
  return useQuery({
    queryKey: ['recipe-catalog', query, category],
    queryFn: async (): Promise<Recipe[]> => {
      const params = new URLSearchParams({ limit: '10' });
      if (query) params.set('q', query);
      else params.set('category', category);
      const response = await fetch(`/api/recipe-catalog?${params}`);
      if (!response.ok) throw await responseError(response, 'Could not load the recipe library.');
      const body = await response.json();
      return body.data ?? [];
    },
    staleTime: 60 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useIngredientCatalog() {
  return useQuery({
    queryKey: ['recipe-catalog', 'ingredients'],
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      const response = await fetch('/api/recipe-catalog?mode=ingredients');
      if (!response.ok) throw await responseError(response, 'Could not load ingredient suggestions.');
      const body = await response.json();
      return body.data ?? [];
    },
    staleTime: 24 * 60 * 60_000,
  });
}
