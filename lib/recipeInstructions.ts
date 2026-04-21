// ============================================================
// MealStack · Recipe Instructions
// Provides step-by-step instructions for recipe detail view.
// ============================================================

import type { Recipe } from '@/types';

const INSTRUCTIONS_BY_NAME: Record<string, string[]> = {
  'egg fried rice': [
    'Boil rice until just cooked, drain, and let it cool for a few minutes.',
    'Heat butter in a pan, then saute chopped garlic for 30 seconds.',
    'Add beaten eggs and scramble until softly set.',
    'Add cooked rice, toss on high heat for 2-3 minutes, and season to taste.',
  ],
  'cheesy pasta': [
    'Boil spaghetti in salted water until al dente, then drain.',
    'Melt butter in a pan over low heat.',
    'Add cooked spaghetti and toss to coat.',
    'Add grated cheddar and stir until creamy. Serve hot.',
  ],
  'spiced milk oats': [
    'Add oats and milk to a saucepan and cook on low-medium heat.',
    'Stir continuously until oats become soft and creamy.',
    'Add cumin and any preferred sweetener/spices.',
    'Cook 1 more minute and serve warm.',
  ],
  'chicken rice bowl': [
    'Marinate chicken with cumin and salt for 10-15 minutes.',
    'Cook basmati rice separately until fluffy.',
    'Pan-cook chicken with garlic until fully cooked and lightly browned.',
    'Assemble rice in a bowl, top with chicken, and serve.',
  ],
  'spinach omelette': [
    'Whisk eggs with a pinch of salt.',
    'Saute garlic in butter for 30 seconds, then add spinach until wilted.',
    'Pour in eggs and cook on low heat until set.',
    'Fold omelette and serve immediately.',
  ],
  'milk tea': [
    'Boil water and add tea leaves; simmer for 1-2 minutes.',
    'Add milk and sugar, then simmer gently for another 2 minutes.',
    'Strain into cups and serve hot.',
  ],
  'egg fry': [
    'Heat oil in a nonstick pan over medium heat.',
    'Crack eggs gently into the pan and sprinkle salt.',
    'Cook until whites are set and edges are crisp.',
    'Serve immediately with bread or rice.',
  ],
};

export function getRecipeInstructions(recipe: Recipe): string[] {
  const key = recipe.name.toLowerCase().trim();
  const predefined = INSTRUCTIONS_BY_NAME[key];
  if (predefined) return predefined;

  const ingredientNames = recipe.recipe_ingredients.map((ri) => ri.ingredient.name);

  return [
    `Prepare ingredients: ${ingredientNames.join(', ')}.`,
    'Cook base ingredients first (grains/proteins) until nearly done.',
    'Add remaining ingredients and season to taste.',
    'Cook until texture is right, then serve warm.',
  ];
}
