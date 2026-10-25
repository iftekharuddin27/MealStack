'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  addPersonalRecipe,
  deletePersonalRecipe,
  readPersonalRecipes,
} from '@/lib/personalRecipeStore';
import type { Recipe } from '@/types';

const KEY = ['personal-recipes'] as const;

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Session expired. Please sign in again.');
  return user.id;
}

export function usePersonalRecipes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => readPersonalRecipes(await currentUserId()),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAddPersonalRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipe: Recipe) => addPersonalRecipe(await currentUserId(), recipe),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePersonalRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipeId: string) => deletePersonalRecipe(await currentUserId(), recipeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
