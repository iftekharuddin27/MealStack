import test from 'node:test';
import assert from 'node:assert/strict';
import { areUnitsCompatible, getBaseUnit, toBase } from '../lib/unitNormalizer.ts';
import { canonicalIngredientKey } from '../lib/ingredientAliases.ts';
import { getExpiryStatus } from '../lib/expiryLogic.ts';
import { subsetMatcher } from '../lib/subsetMatcher.ts';
import { databaseErrorMessage, isOutdatedSchemaError } from '../lib/databaseErrors.ts';
import { mealDbToRecipe, parseMealDbMeasure } from '../lib/recipeCatalog.ts';
import { mergeSavedAndEverydayRecipes } from '../lib/recipeImages.ts';
import { LOCAL_RECIPES } from '../lib/localRecipes.ts';
import type { InventoryItemFlat, Recipe, Unit } from '../types/index.ts';

test('normalizes quantities without mixing dimensions', () => {
  assert.equal(toBase(1.5, 'kg'), 1500);
  assert.equal(toBase(2, 'tbsp'), 30);
  assert.equal(getBaseUnit('cup'), 'ml');
  assert.equal(areUnitsCompatible('kg', 'g'), true);
  assert.equal(areUnitsCompatible('kg', 'ml'), false);
  assert.equal(areUnitsCompatible('pcs', 'g'), false);
});

test('matches equivalent quantities across every supported unit family', () => {
  assert.equal(toBase(1, 'kg'), toBase(1000, 'g'));
  assert.equal(toBase(1, 'l'), toBase(1000, 'ml'));
  assert.equal(toBase(1, 'cup'), toBase(240, 'ml'));
  assert.equal(toBase(1, 'tbsp'), toBase(15, 'ml'));
  assert.equal(toBase(1, 'tsp'), toBase(5, 'ml'));

  const kgInventory = lot({ qty: 1, unit: 'kg', quantity_base: 1000 });
  const gramRecipe = recipe('unit-r1', 'Rice for four', 'Basmati Rice', 1000, 'g');
  assert.equal(subsetMatcher([gramRecipe], [kgInventory]).matched.length, 1);

  const gramInventory = lot({ qty: 1000, unit: 'g', quantity_base: 1000 });
  const kgRecipe = recipe('unit-r2', 'Rice by kilogram', 'Basmati Rice', 1, 'kg');
  assert.equal(subsetMatcher([kgRecipe], [gramInventory]).matched.length, 1);
});

test('parses external recipe measures into MealStack base dimensions', () => {
  assert.deepEqual(parseMealDbMeasure('1 1/2 cups', 'Milk'), {
    quantity: 1.5, unit: 'cup', quantity_base: 360, optional: false,
  });
  assert.equal(parseMealDbMeasure('1 pound', 'Pasta').quantity_base, 453.592);
  assert.equal(parseMealDbMeasure('3 cloves', 'Garlic').unit, 'pcs');
  assert.deepEqual(parseMealDbMeasure('1/2 tsp', 'Salt'), {
    quantity: 3, unit: 'g', quantity_base: 3, optional: false,
  });

  const parsed = mealDbToRecipe({
    idMeal: '123', strMeal: 'Test meal', strCategory: 'Breakfast',
    strInstructions: 'Prepare ingredients. Cook until ready.',
    strIngredient1: 'Milk', strMeasure1: '1 litre',
  });
  assert.equal(parsed.source, 'themealdb');
  assert.equal(parsed.recipe_ingredients[0].quantity_base, 1000);
  assert.equal(mealDbToRecipe({ idMeal: '124', strMeal: 'Vegetable', strIngredient1: 'Egg Plants', strMeasure1: '2' }).recipe_ingredients[0].ingredient.category, 'veg');
});

test('adds images and everyday staples to the unified recipe library', () => {
  const names = LOCAL_RECIPES.map((item) => item.name);
  assert.equal(names.includes('Boiled Egg'), true);
  assert.equal(names.includes('Plain Rice'), true);
  assert.equal(names.includes('Black Tea'), true);

  const saved = recipe('saved-egg', 'Egg Fry', 'Eggs', 2, 'pcs');
  const merged = mergeSavedAndEverydayRecipes([saved], LOCAL_RECIPES);
  assert.equal(merged.filter((item) => item.name === 'Egg Fry').length, 1);
  assert.equal(merged.find((item) => item.name === 'Egg Fry')?.image_url, '/recipes/egg-fry.jpg');
});

test('canonicalizes supported ingredient aliases', () => {
  assert.equal(canonicalIngredientKey(' Rice '), 'basmati rice');
  assert.equal(canonicalIngredientKey('EGG'), 'eggs');
  assert.equal(canonicalIngredientKey('Tea Leaves'), 'tea leaf');
  assert.equal(canonicalIngredientKey('Penne Rigate'), 'pasta');
  assert.equal(canonicalIngredientKey('Tomatoes'), 'tomato');
});

test('recognizes old database schemas without exposing raw SQL errors', () => {
  const error = { code: '42703', message: 'column user_inventory.initial_quantity_base does not exist' };
  assert.equal(isOutdatedSchemaError(error), true);
  assert.equal(databaseErrorMessage(error).includes('initial_quantity_base'), false);
  assert.match(databaseErrorMessage(error), /migration 002_professional_workflows\.sql/);
});

test('classifies expired, critical, warning, and fresh inventory', () => {
  const now = Date.now();
  assert.equal(getExpiryStatus(new Date(now - 1_000)), 'expired');
  assert.equal(getExpiryStatus(new Date(now + 12 * 60 * 60 * 1000)), 'critical');
  assert.equal(getExpiryStatus(new Date(now + 36 * 60 * 60 * 1000)), 'warning');
  assert.equal(getExpiryStatus(new Date(now + 72 * 60 * 60 * 1000)), 'ok');
});

function recipe(id: string, name: string, ingredientName: string, quantity: number, unit: Unit): Recipe {
  return {
    id,
    name,
    description: '',
    emoji: '🍽️',
    time_minutes: 10,
    servings: 1,
    difficulty: 'easy',
    created_at: new Date().toISOString(),
    recipe_ingredients: [{
      id: `${id}-ingredient`,
      ingredient_id: `${id}-catalog`,
      quantity,
      unit,
      quantity_base: quantity,
      ingredient: {
        id: `${id}-catalog`,
        name: ingredientName,
        category: 'grain',
        default_unit: unit,
        price_per_unit: 1,
        created_at: new Date().toISOString(),
      },
    }],
  };
}

function lot(overrides: Partial<InventoryItemFlat> = {}): InventoryItemFlat {
  return {
    id: 'lot-1',
    name: 'Basmati Rice',
    qty: 200,
    unit: 'g',
    quantity_base: 200,
    category: 'grain',
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    price_per_unit: 1,
    purchased_at: new Date().toISOString(),
    storage_location: 'pantry',
    purchase_price: null,
    initial_quantity_base: 200,
    ...overrides,
  };
}

test('matcher excludes expired lots and rejects incompatible units', () => {
  const riceRecipe = recipe('r1', 'Rice bowl', 'Basmati Rice', 100, 'g');
  const expired = lot({ expires_at: new Date(Date.now() - 1000).toISOString() });
  assert.equal(subsetMatcher([riceRecipe], [expired]).matched.length, 0);

  const wrongUnit = lot({ unit: 'ml', quantity_base: 200 });
  const result = subsetMatcher([riceRecipe], [wrongUnit]);
  assert.equal(result.matched.length, 0);
  assert.equal(result.unmatched[0].missing[0].reason, 'incompatible_unit');
});

test('matcher combines valid lots and prioritizes recipes using earlier expiry stock', () => {
  const riceRecipe = recipe('r1', 'Rice bowl', 'Basmati Rice', 300, 'g');
  const milkRecipe = recipe('r2', 'Milk drink', 'Whole Milk', 100, 'ml');
  const inventory = [
    lot({ id: 'rice-1', qty: 150, quantity_base: 150 }),
    lot({ id: 'rice-2', qty: 150, quantity_base: 150 }),
    lot({
      id: 'milk-1', name: 'Whole Milk', qty: 200, unit: 'ml', quantity_base: 200,
      initial_quantity_base: 200, category: 'dairy', storage_location: 'fridge',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  ];
  const result = subsetMatcher([riceRecipe, milkRecipe], inventory);
  assert.deepEqual(result.matched.map((item) => item.id), ['r2', 'r1']);
});
