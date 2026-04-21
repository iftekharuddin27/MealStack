-- ============================================================
-- MealStack Database Schema · Supabase PostgreSQL
-- Migration 001 · Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. INGREDIENTS (master catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL CHECK (category IN (
                    'grain', 'dairy', 'protein', 'veg', 'spice'
                  )),
  default_unit    TEXT NOT NULL,           -- canonical unit: g | ml | pcs
  price_per_unit  NUMERIC(10, 2),          -- BDT per base unit (for waste analytics)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USER INVENTORY (linked to Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_inventory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity        NUMERIC(10, 3) NOT NULL CHECK (quantity >= 0),
  unit            TEXT NOT NULL,           -- user-chosen unit (kg, g, ml, l, pcs …)
  quantity_base   NUMERIC(12, 3),          -- auto-normalized to g / ml / pcs via trigger
  expires_at      TIMESTAMPTZ NOT NULL,
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ingredient_id)
);

-- ============================================================
-- 3. RECIPES
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  emoji           TEXT DEFAULT '🍽️',
  time_minutes    INT,
  servings        INT DEFAULT 2,
  difficulty      TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. RECIPE INGREDIENTS (join table)
-- ============================================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity        NUMERIC(10, 3) NOT NULL,
  unit            TEXT NOT NULL,
  quantity_base   NUMERIC(12, 3) NOT NULL,  -- pre-normalized on insert
  UNIQUE(recipe_id, ingredient_id)
);

-- ============================================================
-- 5. COOKING HISTORY (for Waste Analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS cooking_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id       UUID NOT NULL REFERENCES recipes(id),
  cooked_at       TIMESTAMPTZ DEFAULT NOW(),
  money_saved     NUMERIC(10, 2),           -- BDT value of ingredients used (not wasted)
  servings_made   INT DEFAULT 2
);

-- ============================================================
-- UNIT NORMALIZATION TRIGGER
-- Fires on INSERT or UPDATE on user_inventory and recipe_ingredients
-- Converts quantity to base unit (g, ml, pcs) automatically
-- ============================================================
CREATE OR REPLACE FUNCTION normalize_quantity()
RETURNS TRIGGER AS $$
DECLARE
  factor NUMERIC;
BEGIN
  factor := CASE NEW.unit
    WHEN 'kg'   THEN 1000
    WHEN 'l'    THEN 1000
    WHEN 'tsp'  THEN 5
    WHEN 'tbsp' THEN 15
    WHEN 'cup'  THEN 240
    ELSE 1  -- g, ml, pcs treated as base
  END;
  NEW.quantity_base := NEW.quantity * factor;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_user_inventory ON user_inventory;

CREATE TRIGGER trg_normalize_user_inventory
  BEFORE INSERT OR UPDATE ON user_inventory
  FOR EACH ROW EXECUTE FUNCTION normalize_quantity();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Each user only sees and modifies their own data
-- ============================================================
ALTER TABLE user_inventory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_history  ENABLE ROW LEVEL SECURITY;

-- user_inventory policies
DROP POLICY IF EXISTS "Users read own inventory" ON user_inventory;
CREATE POLICY "Users read own inventory"
  ON user_inventory FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own inventory" ON user_inventory;
CREATE POLICY "Users insert own inventory"
  ON user_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own inventory" ON user_inventory;
CREATE POLICY "Users update own inventory"
  ON user_inventory FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own inventory" ON user_inventory;
CREATE POLICY "Users delete own inventory"
  ON user_inventory FOR DELETE
  USING (auth.uid() = user_id);

-- cooking_history policies
DROP POLICY IF EXISTS "Users read own history" ON cooking_history;
CREATE POLICY "Users read own history"
  ON cooking_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own history" ON cooking_history;
CREATE POLICY "Users insert own history"
  ON cooking_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id     ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_expires_at  ON user_inventory(expires_at);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe  ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cooking_history_user_id    ON cooking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_history_cooked_at  ON cooking_history(cooked_at DESC);
