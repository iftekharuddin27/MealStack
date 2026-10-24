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
  purchased_at: string;
  storage_location: StorageLocation;
  purchase_price: number | null;
  initial_quantity_base: number;
}

export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'counter';
export type InventoryEventType = 'consumed' | 'discarded' | 'donated' | 'expired';

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
  ingredient_value_used: number;
  rescued_value: number;
  items_rescued: number;
  servings_made: number;
}

// ── Analytics ──────────────────────────────────────────────
export interface RescuedValueByCategory {
  category: Category;
  rescued_value: number;
}

export interface WeeklySavings {
  week_label: string;
  rescued: number;
  wasted: number;
  donated: number;
}

export interface AnalyticsSummary {
  rescued_value_7d: number;
  recipes_cooked_7d: number;
  ingredient_value_used_30d: number;
  rescued_value_30d: number;
  wasted_value_30d: number;
  donated_value_30d: number;
  recipes_cooked_30d: number;
  items_rescued: number;
  waste_rate_pct: number;
  rescued_by_category: RescuedValueByCategory[];
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
  expires_at: string;
  purchased_at?: string;
  storage_location: StorageLocation;
  purchase_price?: number | null;
}

export interface UpdateInventoryRequest {
  id: string;
  quantity: number;
  unit: Unit;
  expires_at: string;
  storage_location: StorageLocation;
  purchase_price?: number | null;
}

export interface ShoppingListItem {
  id: string;
  ingredient_id: string | null;
  ingredient_name: string;
  quantity_base: number;
  unit: 'g' | 'ml' | 'pcs';
  checked: boolean;
  created_at: string;
}

export interface DeductInventoryRequest {
  recipe_id: string;
}

export interface MatchedRecipesResponse {
  matched: Recipe[];
  unmatched: Recipe[];
}
