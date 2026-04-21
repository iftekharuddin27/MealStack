// ============================================================
// MealStack · Subset Matcher Algorithm
//
// Core engine: returns ONLY recipes where every required
// ingredient is present in UserInventory at sufficient
// quantity — after unit normalization.
//
// Complexity: O(N + R×I)
//   N = inventory items (map build)
//   R = number of recipes
//   I = average ingredients per recipe
// ============================================================

import { toBase } from './unitNormalizer';
import {
  canonicalIngredientKey,
  ingredientNamesMatch,
} from './ingredientAliases';
import type { Recipe, InventoryItemFlat, Unit } from '@/types';

// ── Types ────────────────────────────────────────────────────

export interface MatchResult {
  /** Recipes the user can cook right now */
  matched: Recipe[];
  /** Recipes the user cannot cook (with reason per ingredient) */
  unmatched: UnmatchedRecipe[];
}

export interface UnmatchedRecipe {
  recipe: Recipe;
  missing: MissingIngredient[];
}

export interface MissingIngredient {
  name: string;
  required: number;
  required_unit: Unit;
  available: number;
  shortfall: number;  // in base units
}

// ── Inventory Index ──────────────────────────────────────────

/**
 * Build a normalized inventory lookup map in O(N).
 * Keys are lowercased ingredient names.
 * Values are total quantity in base units (g / ml / pcs).
 *
 * We accumulate quantities so that two separate rows for
 * "Flour 300g" + "Flour 200g" correctly sum to 500g.
 */
function buildInventoryMap(
  inventory: InventoryItemFlat[]
): Map<string, number> {
  const map = new Map<string, number>();

  for (const item of inventory) {
    const key = canonicalIngredientKey(item.name);
    const baseQty = toBase(item.qty, item.unit);
    map.set(key, (map.get(key) ?? 0) + baseQty);
  }

  return map;
}

// ── Core Algorithm ───────────────────────────────────────────

/**
 * Subset Matcher
 *
 * Given a list of recipes and the user's current inventory,
 * returns matched (can cook now) and unmatched (missing items).
 *
 * Unit normalization is applied to both sides:
 *   - Inventory: "1kg flour" → 1000g in map
 *   - Recipe:    "250g flour" → 250 needed
 *   - Result:    1000 >= 250 ✓  remaining = 750g
 *
 * @param recipes  Full recipe list with their recipe_ingredients
 * @param inventory  User's current fridge contents (flat format)
 */
export function subsetMatcher(
  recipes: Recipe[],
  inventory: InventoryItemFlat[]
): MatchResult {
  // Step 1: Build normalized inventory map — O(N)
  const invMap = buildInventoryMap(inventory);

  const matched: Recipe[] = [];
  const unmatched: UnmatchedRecipe[] = [];

  // Step 2: Check each recipe — O(R × I)
  for (const recipe of recipes) {
    const missing: MissingIngredient[] = [];

    for (const ri of recipe.recipe_ingredients) {
      const key = canonicalIngredientKey(ri.ingredient.name);
      const needed = toBase(ri.quantity, ri.unit as Unit);
      const available = invMap.get(key) ?? 0;

      if (available < needed) {
        missing.push({
          name: ri.ingredient.name,
          required: ri.quantity,
          required_unit: ri.unit as Unit,
          available,
          shortfall: needed - available,
        });
      }
    }

    if (missing.length === 0) {
      matched.push(recipe);
    } else {
      unmatched.push({ recipe, missing });
    }
  }

  return { matched, unmatched };
}

// ── Deduction Preview ─────────────────────────────────────────

export interface DeductionPreview {
  ingredient_name: string;
  before_qty: number;
  before_unit: Unit;
  deduct_qty: number;
  deduct_unit: Unit;
  after_base: number;    // remaining in base units
  after_display: string; // e.g. "750g" or "0.75kg"
  used_up: boolean;
}

/**
 * Preview what the inventory will look like after cooking a recipe.
 * Used by CookModal before the user confirms.
 */
export function previewDeduction(
  recipe: Recipe,
  inventory: InventoryItemFlat[]
): DeductionPreview[] {
  return recipe.recipe_ingredients.map((ri) => {
    const item = inventory.find(
      (i) => ingredientNamesMatch(i.name, ri.ingredient.name)
    );

    const beforeBase = item ? toBase(item.qty, item.unit) : 0;
    const deductBase = toBase(ri.quantity, ri.unit as Unit);
    const afterBase = Math.max(0, beforeBase - deductBase);

    return {
      ingredient_name: ri.ingredient.name,
      before_qty: item?.qty ?? 0,
      before_unit: (item?.unit ?? ri.unit) as Unit,
      deduct_qty: ri.quantity,
      deduct_unit: ri.unit as Unit,
      after_base: afterBase,
      after_display: `${Math.round(afterBase)}${item?.unit ?? 'g'}`,
      used_up: afterBase === 0,
    };
  });
}
