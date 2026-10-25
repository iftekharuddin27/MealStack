import type { Recipe } from '@/types';

const RECIPE_IMAGES: Record<string, string> = {
  'egg fried rice': '/recipes/egg-fried-rice.jpg',
  'cheesy pasta': '/recipes/cheesy-pasta.jpg',
  'spiced milk oats': '/recipes/spiced-milk-oats.jpg',
  'chicken rice bowl': '/recipes/chicken-rice-bowl.jpg',
  'spinach omelette': '/recipes/spinach-omelette.jpg',
  'milk tea': '/recipes/milk-tea.jpg',
  'egg fry': '/recipes/egg-fry.jpg',
  'fried egg': '/recipes/egg-fry.jpg',
  'boiled egg': '/recipes/boiled-egg.jpg',
  'plain rice': '/recipes/plain-rice.jpg',
  'black tea': '/recipes/black-tea.jpg',
  tea: '/recipes/black-tea.jpg',
};

export function addRecipePresentation(recipe: Recipe): Recipe {
  const key = recipe.name.toLowerCase().trim();
  return {
    ...recipe,
    source: recipe.source ?? 'mealstack',
    image_url: recipe.image_url ?? RECIPE_IMAGES[key] ?? null,
  };
}

export function mergeSavedAndEverydayRecipes(saved: Recipe[], everyday: Recipe[]): Recipe[] {
  const merged = new Map<string, Recipe>();
  for (const recipe of saved) merged.set(recipe.name.toLowerCase().trim(), addRecipePresentation(recipe));
  for (const recipe of everyday) {
    const key = recipe.name.toLowerCase().trim();
    if (!merged.has(key)) merged.set(key, addRecipePresentation(recipe));
  }
  return Array.from(merged.values());
}
