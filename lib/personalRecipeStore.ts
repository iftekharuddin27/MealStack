import type { Recipe } from '@/types';

const STORAGE_KEY = 'mealstack_personal_recipes_by_user';

function readAll(): Record<string, Recipe[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeAll(value: Record<string, Recipe[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function readPersonalRecipes(userId: string): Recipe[] {
  return readAll()[userId] ?? [];
}

export function addPersonalRecipe(userId: string, recipe: Recipe) {
  const all = readAll();
  all[userId] = [recipe, ...(all[userId] ?? [])];
  writeAll(all);
}

export function deletePersonalRecipe(userId: string, recipeId: string) {
  const all = readAll();
  all[userId] = (all[userId] ?? []).filter((recipe) => recipe.id !== recipeId);
  writeAll(all);
}
