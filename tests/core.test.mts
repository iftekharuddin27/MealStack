import test from 'node:test';
import assert from 'node:assert/strict';
import { areUnitsCompatible, getBaseUnit, toBase } from '../lib/unitNormalizer.ts';
import { canonicalIngredientKey } from '../lib/ingredientAliases.ts';
import { getExpiryStatus } from '../lib/expiryLogic.ts';
import { subsetMatcher } from '../lib/subsetMatcher.ts';
import { databaseErrorMessage, isOutdatedSchemaError } from '../lib/databaseErrors.ts';
import type { InventoryItemFlat, Recipe } from '../types/index.ts';

test('normalizes quantities without mixing dimensions', () => {
  assert.equal(toBase(1.5, 'kg'), 1500);
  assert.equal(toBase(2, 'tbsp'), 30);
  assert.equal(getBaseUnit('cup'), 'ml');
  assert.equal(areUnitsCompatible('kg', 'g'), true);
  assert.equal(areUnitsCompatible('kg', 'ml'), false);
  assert.equal(areUnitsCompatible('pcs', 'g'), false);
});

test('canonicalizes supported ingredient aliases', () => {
  assert.equal(canonicalIngredientKey(' Rice '), 'basmati rice');
  assert.equal(canonicalIngredientKey('EGG'), 'eggs');
  assert.equal(canonicalIngredientKey('Tea Leaves'), 'tea leaf');
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

function recipe(id: string, name: string, ingredientName: string, quantity: number, unit: 'g' | 'ml' | 'pcs'): Recipe {
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
