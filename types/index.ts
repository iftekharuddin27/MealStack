// ============================================================
// MealStack · Global TypeScript Types
// ============================================================

export type Category = 'grain' | 'dairy' | 'protein' | 'veg' | 'spice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'tsp' | 'tbsp' | 'cup';

// ── Ingredient master catalog ──────────────────────────────
export interface Ingredient {
  id: string;
  name: string;
  category: Category;
  default_unit: Unit;
  price_per_unit: number; // BDT per base unit
  created_at: string;
}

// ── UserInventory row ──────────────────────────────────────
export interface InventoryItem {
  id: string;
  user_id: string;
  ingredient_id: string;
  ingredient: Ingredient; // joined
  quantity: number;
  unit: Unit;
  quantity_base: number; // normalized to g/ml/pcs by DB trigger
  expires_at: string;
  added_at: string;
}

// Flat shape used in forms and algorithm
export interface InventoryItemFlat {
  id: string;
  name: string;
  qty: number;
  unit: Unit;
  quantity_base: number;
  category: Category;
  expires_at: string;
  price_per_unit: number;
}

// ── Recipe ─────────────────────────────────────────────────
export interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  ingredient: Ingredient; // joined
  quantity: number;
  unit: Unit;
  quantity_base: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  emoji: string;
  time_minutes: number;
  servings: number;
  difficulty: Difficulty;
  recipe_ingredients: RecipeIngredient[];
  created_at: string;
}

// ── Cooking history ────────────────────────────────────────
export interface CookingHistory {
  id: string;
  user_id: string;
  recipe_id: string;
  recipe: Recipe; // joined
  cooked_at: string;
  money_saved: number;
  servings_made: number;
}

// ── Analytics ──────────────────────────────────────────────
export interface SavingsByCategory {
  category: Category;
  total_saved: number;
}

export interface WeeklySavings {
  week_label: string;
  saved: number;
  wasted: number;
  near_miss: number;
}

export interface AnalyticsSummary {
  total_saved_7d: number;
  recipes_cooked_7d: number;
  total_saved_30d: number;
  recipes_cooked_30d: number;
  items_rescued: number;
  waste_rate_pct: number;
  savings_by_category: SavingsByCategory[];
  weekly_trend: WeeklySavings[];
}

// ── Expiry status helpers ──────────────────────────────────
export type ExpiryStatus = 'critical' | 'warning' | 'ok' | 'expired';

export interface ExpiryInfo {
  status: ExpiryStatus;
  hours_remaining: number;
  label: string;
}

// ── API request/response shapes ────────────────────────────
export interface AddInventoryRequest {
  ingredient_name: string;
  quantity: number;
  unit: Unit;
  category: Category;
}

export interface DeductInventoryRequest {
  recipe_id: string;
}

export interface MatchedRecipesResponse {
  matched: Recipe[];
  unmatched: Recipe[];
}
