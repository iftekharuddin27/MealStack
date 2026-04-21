// ============================================================
// MealStack · Ingredient Alias Utilities
// Normalizes common user-entered names to recipe catalog names.
// ============================================================

const ALIAS_MAP: Record<string, string[]> = {
  'basmati rice': ['rice'],
  'whole milk': ['milk'],
  'tea leaf': ['tea leaves', 'black tea', 'tea'],
  sugar: ['brown sugar'],
  'olive oil': ['oil'],
  'cheddar cheese': ['cheese'],
  'all-purpose flour': ['flour', 'ap flour', 'all purpose flour'],
  'chicken breast': ['chicken'],
  'black pepper': ['pepper'],
  eggs: ['egg'],
};

export function normalizeIngredientKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function canonicalIngredientKey(name: string): string {
  const normalized = normalizeIngredientKey(name);

  for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
    if (normalized === canonical) {
      return canonical;
    }

    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

export function ingredientNamesMatch(a: string, b: string): boolean {
  return canonicalIngredientKey(a) === canonicalIngredientKey(b);
}
