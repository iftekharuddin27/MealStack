// ============================================================
// MealStack · Unit Normalizer
// Converts any qty+unit pair to its base unit (g, ml, pcs)
// so the Subset Matcher can do pure numeric comparisons.
// ============================================================

import type { Unit } from '@/types';

/**
 * Conversion factors relative to the base unit.
 * Base units: g (mass), ml (volume), pcs (countable)
 */
export const UNIT_TO_BASE: Record<Unit, number> = {
  g:    1,
  kg:   1000,
  ml:   1,
  l:    1000,
  pcs:  1,
  tsp:  5,    // ~5 ml
  tbsp: 15,   // ~15 ml
  cup:  240,  // ~240 ml
};

export type UnitDimension = 'mass' | 'volume' | 'count';

export function getUnitDimension(unit: Unit): UnitDimension {
  if (unit === 'g' || unit === 'kg') return 'mass';
  if (unit === 'pcs') return 'count';
  return 'volume';
}

export function getBaseUnit(unit: Unit): 'g' | 'ml' | 'pcs' {
  const dimension = getUnitDimension(unit);
  if (dimension === 'mass') return 'g';
  if (dimension === 'volume') return 'ml';
  return 'pcs';
}

export function getCompatibleUnits(unit: Unit): Unit[] {
  const dimension = getUnitDimension(unit);
  if (dimension === 'mass') return ['g', 'kg'];
  if (dimension === 'volume') return ['ml', 'l', 'tsp', 'tbsp', 'cup'];
  return ['pcs'];
}

/**
 * Convert a quantity from any supported unit to its base unit.
 * Example: toBase(1, 'kg') → 1000  (grams)
 *          toBase(2, 'tbsp') → 30  (ml)
 */
export function toBase(qty: number, unit: Unit): number {
  return qty * (UNIT_TO_BASE[unit] ?? 1);
}

/**
 * Convert a base-unit quantity back to a human-readable unit.
 * Chooses the most sensible unit automatically.
 * Example: fromBase(1500, 'g') → { qty: 1.5, unit: 'kg' }
 */
export function fromBase(
  baseQty: number,
  preferredUnit: Unit
): { qty: number; unit: Unit } {
  const factor = UNIT_TO_BASE[preferredUnit] ?? 1;
  return { qty: Math.round((baseQty / factor) * 100) / 100, unit: preferredUnit };
}

/**
 * Format a quantity for display.
 * Rounds to 2 decimal places and appends unit.
 * Example: formatQty(750, 'g') → '750g'
 *          formatQty(1.5, 'kg') → '1.5kg'
 */
export function formatQty(qty: number, unit: Unit): string {
  const rounded = Math.round(qty * 100) / 100;
  return `${rounded}${unit}`;
}

/**
 * Check if two units are compatible (same base type).
 * Mass: g, kg → compatible
 * Volume: ml, l, tsp, tbsp, cup → compatible
 * Count: pcs → only compatible with pcs
 */
export function areUnitsCompatible(unitA: Unit, unitB: Unit): boolean {
  return getUnitDimension(unitA) === getUnitDimension(unitB);
}

export function getConversionHint(unit: Unit): string {
  const hints: Record<Unit, string> = {
    g: '1000 g = 1 kg',
    kg: '1 kg = 1000 g',
    ml: '1000 ml = 1 l',
    l: '1 l = 1000 ml',
    tsp: '1 tsp = 5 ml',
    tbsp: '1 tbsp = 15 ml',
    cup: '1 cup = 240 ml',
    pcs: 'Pieces are matched by count',
  };
  return hints[unit];
}
