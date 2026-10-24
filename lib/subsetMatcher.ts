import {
  areUnitsCompatible,
  getBaseUnit,
  getUnitDimension,
  toBase,
} from './unitNormalizer.ts';
import { canonicalIngredientKey, ingredientNamesMatch } from './ingredientAliases.ts';
import type { InventoryItemFlat, Recipe, Unit } from '@/types';

export interface MatchResult {
  matched: Recipe[];
  unmatched: UnmatchedRecipe[];
}

export interface UnmatchedRecipe {
  recipe: Recipe;
  missing: MissingIngredient[];
  availableRatio: number;
}

export interface MissingIngredient {
  ingredient_id: string;
  name: string;
  required: number;
  required_unit: Unit;
  available: number;
  shortfall: number;
  base_unit: 'g' | 'ml' | 'pcs';
  reason: 'missing' | 'insufficient' | 'incompatible_unit';
}

interface InventoryAggregate {
  available: number;
  earliestExpiry: number;
}

function mapKey(name: string, unit: Unit): string {
  return `${canonicalIngredientKey(name)}:${getUnitDimension(unit)}`;
}

function validInventory(inventory: InventoryItemFlat[]): InventoryItemFlat[] {
  const now = Date.now();
  return inventory.filter((item) =>
    item.qty > 0 && new Date(item.expires_at).getTime() > now
  );
}

function buildInventoryMap(inventory: InventoryItemFlat[]): Map<string, InventoryAggregate> {
  const map = new Map<string, InventoryAggregate>();

  for (const item of validInventory(inventory)) {
    const key = mapKey(item.name, item.unit);
    const current = map.get(key);
    const expiry = new Date(item.expires_at).getTime();
    map.set(key, {
      available: (current?.available ?? 0) + toBase(item.qty, item.unit),
      earliestExpiry: Math.min(current?.earliestExpiry ?? Number.POSITIVE_INFINITY, expiry),
    });
  }
  return map;
}

function recipeExpiryScore(
  recipe: Recipe,
  inventoryMap: Map<string, InventoryAggregate>
): number {
  return Math.min(
    ...recipe.recipe_ingredients.map((item) =>
      inventoryMap.get(mapKey(item.ingredient.name, item.unit as Unit))?.earliestExpiry
      ?? Number.POSITIVE_INFINITY
    )
  );
}

export function subsetMatcher(
  recipes: Recipe[],
  inventory: InventoryItemFlat[]
): MatchResult {
  const inventoryMap = buildInventoryMap(inventory);
  const nonExpired = validInventory(inventory);
  const matched: Recipe[] = [];
  const unmatched: UnmatchedRecipe[] = [];

  for (const recipe of recipes) {
    const missing: MissingIngredient[] = [];
    let availableTotal = 0;
    let requiredTotal = 0;

    for (const recipeIngredient of recipe.recipe_ingredients) {
      const unit = recipeIngredient.unit as Unit;
      const needed = toBase(recipeIngredient.quantity, unit);
      const available = inventoryMap.get(
        mapKey(recipeIngredient.ingredient.name, unit)
      )?.available ?? 0;
      const sameNameLots = nonExpired.filter((item) =>
        ingredientNamesMatch(item.name, recipeIngredient.ingredient.name)
      );
      const hasWrongDimension = sameNameLots.length > 0 && sameNameLots.every((item) =>
        !areUnitsCompatible(item.unit, unit)
      );

      requiredTotal += needed;
      availableTotal += Math.min(available, needed);

      if (available < needed) {
        missing.push({
          ingredient_id: recipeIngredient.ingredient_id,
          name: recipeIngredient.ingredient.name,
          required: recipeIngredient.quantity,
          required_unit: unit,
          available,
          shortfall: needed - available,
          base_unit: getBaseUnit(unit),
          reason: hasWrongDimension
            ? 'incompatible_unit'
            : available > 0
              ? 'insufficient'
              : 'missing',
        });
      }
    }

    if (missing.length === 0) {
      matched.push(recipe);
    } else {
      unmatched.push({
        recipe,
        missing,
        availableRatio: requiredTotal > 0 ? availableTotal / requiredTotal : 0,
      });
    }
  }

  matched.sort((a, b) =>
    recipeExpiryScore(a, inventoryMap) - recipeExpiryScore(b, inventoryMap)
    || a.time_minutes - b.time_minutes
  );
  unmatched.sort((a, b) =>
    b.availableRatio - a.availableRatio
    || a.missing.length - b.missing.length
    || a.recipe.time_minutes - b.recipe.time_minutes
  );

  return { matched, unmatched };
}

export interface DeductionPreview {
  ingredient_name: string;
  before_qty: number;
  before_unit: Unit;
  deduct_qty: number;
  deduct_unit: Unit;
  after_base: number;
  after_display: string;
  used_up: boolean;
}

export function previewDeduction(
  recipe: Recipe,
  inventory: InventoryItemFlat[],
  servings = recipe.servings
): DeductionPreview[] {
  const multiplier = servings / Math.max(recipe.servings, 1);
  const usable = validInventory(inventory);

  return recipe.recipe_ingredients.map((recipeIngredient) => {
    const recipeUnit = recipeIngredient.unit as Unit;
    const lots = usable.filter((item) =>
      ingredientNamesMatch(item.name, recipeIngredient.ingredient.name)
      && areUnitsCompatible(item.unit, recipeUnit)
    );
    const beforeBase = lots.reduce((sum, item) => sum + toBase(item.qty, item.unit), 0);
    const deductBase = toBase(recipeIngredient.quantity, recipeUnit) * multiplier;
    const afterBase = Math.max(0, beforeBase - deductBase);
    const baseUnit = getBaseUnit(recipeUnit);

    return {
      ingredient_name: recipeIngredient.ingredient.name,
      before_qty: beforeBase,
      before_unit: baseUnit,
      deduct_qty: Math.round(recipeIngredient.quantity * multiplier * 100) / 100,
      deduct_unit: recipeUnit,
      after_base: afterBase,
      after_display: `${Math.round(afterBase * 100) / 100}${baseUnit}`,
      used_up: afterBase === 0,
    };
  });
}
