import { getBaseUnit, getUnitDimension, toBase } from './unitNormalizer.ts';
import type {
  Category,
  Difficulty,
  IngredientSuggestion,
  Recipe,
  RecipeIngredient,
  Unit,
} from '@/types';

export interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strMealThumb?: string | null;
  strSource?: string | null;
  strYoutube?: string | null;
  [key: string]: string | null | undefined;
}

export interface MealDbIngredient {
  idIngredient: string;
  strIngredient: string;
  strThumb?: string | null;
}

const FRACTIONS: Record<string, string> = {
  '¼': ' 1/4', '½': ' 1/2', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3',
  '⅛': ' 1/8', '⅜': ' 3/8', '⅝': ' 5/8', '⅞': ' 7/8',
};

const PROTEIN_WORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'goat', 'turkey', 'duck', 'fish', 'salmon',
  'tuna', 'prawn', 'shrimp', 'crab', 'egg', 'tofu', 'lentil', 'bean', 'chickpea',
];
const DAIRY_WORDS = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'paneer'];
const GRAIN_WORDS = [
  'rice', 'flour', 'pasta', 'spaghetti', 'penne', 'noodle', 'bread', 'oat', 'cereal',
  'couscous', 'quinoa', 'barley', 'tortilla', 'breadcrumbs',
];
const SPICE_WORDS = [
  'salt', 'pepper', 'spice', 'seasoning', 'powder', 'oil', 'vinegar', 'sauce',
  'extract', 'sugar', 'honey', 'syrup', 'stock', 'mustard', 'paste', 'masala',
];
const LIQUID_WORDS = [
  'milk', 'water', 'oil', 'juice', 'stock', 'broth', 'vinegar', 'sauce', 'cream',
  'wine', 'beer', 'syrup', 'extract', 'coconut milk',
];
const COUNT_WORDS = [
  'egg', 'onion', 'garlic', 'lemon', 'lime', 'apple', 'banana', 'orange', 'tomato',
  'potato', 'chilli', 'pepper', 'carrot', 'avocado', 'clove', 'leaf', 'leaves',
];

function includesAny(name: string, words: string[]): boolean {
  return words.some((word) => name.includes(word));
}

export function inferIngredientCategory(name: string): Category {
  const normalized = name.toLowerCase();
  if (/egg\s*plants?|aubergine|bell peppers?|red peppers?|green peppers?|yellow peppers?|chill(?:i|y)|chilies/.test(normalized)) return 'veg';
  if (includesAny(normalized, PROTEIN_WORDS)) return 'protein';
  if (includesAny(normalized, DAIRY_WORDS)) return 'dairy';
  if (includesAny(normalized, GRAIN_WORDS)) return 'grain';
  if (includesAny(normalized, SPICE_WORDS)) return 'spice';
  return 'veg';
}

function dryDensityGramsPerMl(name: string): number | null {
  const normalized = name.toLowerCase();
  if (/bell peppers?|red peppers?|green peppers?|yellow peppers?|chill(?:i|y)|chilies/.test(normalized)) {
    return null;
  }
  const densities: Array<[string[], number]> = [
    [['salt'], 1.2],
    [['sugar'], 0.84],
    [['flour'], 0.53],
    [['oat'], 0.34],
    [['rice'], 0.8],
    [['butter'], 0.96],
    [['honey', 'syrup'], 1.4],
    [['pepper', 'spice', 'seasoning', 'powder', 'masala'], 0.46],
  ];
  return densities.find(([words]) => includesAny(normalized, words))?.[1] ?? null;
}

export function inferIngredientUnit(name: string): Unit {
  const normalized = name.toLowerCase();
  if (includesAny(normalized, LIQUID_WORDS)) return 'ml';
  if (includesAny(normalized, COUNT_WORDS)) return 'pcs';
  return 'g';
}

function normalizeMeasure(value: string): string {
  let normalized = value.toLowerCase().trim().replace(/,/g, '.');
  for (const [symbol, fraction] of Object.entries(FRACTIONS)) {
    normalized = normalized.replaceAll(symbol, fraction);
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function leadingQuantity(value: string): number | null {
  const mixed = value.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);

  const fraction = value.match(/^(\d+)\/(\d+)/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);

  const number = value.match(/^(\d+(?:\.\d+)?)/);
  return number ? Number(number[1]) : null;
}

export interface ParsedMeasure {
  quantity: number;
  unit: Unit;
  quantity_base: number;
  optional: boolean;
}

export function parseMealDbMeasure(measure: string, ingredientName: string): ParsedMeasure {
  const value = normalizeMeasure(measure);
  const parsedQuantity = leadingQuantity(value);
  const optional = parsedQuantity === null && /to taste|as needed|optional|sprinkl|garnish/.test(value);
  let quantity = parsedQuantity ?? 1;
  let unit: Unit = inferIngredientUnit(ingredientName);

  if (/fluid ounces?|fl\.?\s*oz/.test(value)) {
    quantity *= 29.5735;
    unit = 'ml';
  } else if (/kilograms?|\bkgs?\b/.test(value)) {
    unit = 'kg';
  } else if (/pounds?|\blbs?\b/.test(value)) {
    quantity *= 453.592;
    unit = 'g';
  } else if (/ounces?|\boz\b/.test(value)) {
    quantity *= 28.3495;
    unit = 'g';
  } else if (/millilit(?:er|re)s?|\bml\b/.test(value)) {
    unit = 'ml';
  } else if (/lit(?:er|re)s?|\bl\b/.test(value)) {
    unit = 'l';
  } else if (/gallons?/.test(value)) {
    quantity *= 3785.41;
    unit = 'ml';
  } else if (/quarts?/.test(value)) {
    quantity *= 946.353;
    unit = 'ml';
  } else if (/pints?/.test(value)) {
    quantity *= 473.176;
    unit = 'ml';
  } else if (/tablespoons?|tbsps?|tbsp\.?/.test(value)) {
    unit = 'tbsp';
  } else if (/teaspoons?|tsps?|tsp\.?/.test(value)) {
    unit = 'tsp';
  } else if (/cups?/.test(value)) {
    unit = 'cup';
  } else if (/grams?|(?:^|\d)g(?:$|\s)/.test(value)) {
    unit = 'g';
  } else if (/cloves?|leaves|pieces?|pcs?|cans?|tins?|packages?|bunch(?:es)?|slices?/.test(value)) {
    unit = 'pcs';
  } else if (optional && inferIngredientCategory(ingredientName) === 'spice') {
    quantity = 0.25;
    unit = 'tsp';
  }

  const density = dryDensityGramsPerMl(ingredientName);
  if (density && getUnitDimension(unit) === 'volume') {
    quantity = toBase(quantity, unit) * density;
    unit = 'g';
  }

  quantity = Math.max(0.001, Math.round(quantity * 1000) / 1000);
  return {
    quantity,
    unit,
    quantity_base: Math.round(toBase(quantity, unit) * 1000) / 1000,
    optional,
  };
}

function instructions(value: string | null | undefined): string[] {
  if (!value) return ['Prepare all ingredients.', 'Cook until done and serve.'];
  const lines = value
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : [value.trim()];
}

function categoryEmoji(category: string): string {
  const key = category.toLowerCase();
  if (key.includes('breakfast')) return '🍳';
  if (key.includes('dessert')) return '🍰';
  if (key.includes('seafood')) return '🐟';
  if (key.includes('vegetarian') || key.includes('vegan')) return '🥗';
  if (key.includes('chicken')) return '🍗';
  if (key.includes('beef') || key.includes('lamb') || key.includes('pork')) return '🍲';
  if (key.includes('pasta')) return '🍝';
  return '🍽️';
}

function difficultyFor(ingredientCount: number): Difficulty {
  if (ingredientCount >= 13) return 'hard';
  if (ingredientCount >= 8) return 'medium';
  return 'easy';
}

export function mealDbToRecipe(meal: MealDbMeal): Recipe {
  const createdAt = new Date(0).toISOString();
  const recipeIngredients: RecipeIngredient[] = [];

  for (let index = 1; index <= 20; index += 1) {
    const name = meal[`strIngredient${index}`]?.trim();
    if (!name) continue;
    const originalMeasure = meal[`strMeasure${index}`]?.trim() ?? '';
    const parsed = parseMealDbMeasure(originalMeasure, name);
    const ingredientId = `themealdb-ingredient-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const baseUnit = getBaseUnit(parsed.unit);
    recipeIngredients.push({
      id: `themealdb-${meal.idMeal}-ingredient-${index}`,
      ingredient_id: ingredientId,
      quantity: parsed.quantity,
      unit: parsed.unit,
      quantity_base: parsed.quantity_base,
      optional: parsed.optional,
      original_measure: originalMeasure,
      ingredient: {
        id: ingredientId,
        name,
        category: inferIngredientCategory(name),
        default_unit: baseUnit,
        price_per_unit: 0,
        created_at: createdAt,
      },
    });
  }

  const steps = instructions(meal.strInstructions);
  const category = meal.strCategory ?? 'International';
  return {
    id: `themealdb-${meal.idMeal}`,
    name: meal.strMeal,
    description: `${meal.strArea ? `${meal.strArea} · ` : ''}${category} recipe`,
    emoji: categoryEmoji(category),
    time_minutes: Math.min(90, Math.max(15, steps.length * 5)),
    servings: 4,
    difficulty: difficultyFor(recipeIngredients.length),
    recipe_ingredients: recipeIngredients,
    created_at: createdAt,
    source: 'themealdb',
    source_url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
    image_url: meal.strMealThumb ?? null,
    instructions: steps,
    area: meal.strArea ?? null,
    meal_category: meal.strCategory ?? null,
  };
}

export function mealDbIngredientToSuggestion(item: MealDbIngredient): IngredientSuggestion {
  return {
    id: `themealdb-ingredient-${item.idIngredient}`,
    name: item.strIngredient.trim(),
    category: inferIngredientCategory(item.strIngredient),
    unit: inferIngredientUnit(item.strIngredient),
    image_url: item.strThumb ?? null,
  };
}
