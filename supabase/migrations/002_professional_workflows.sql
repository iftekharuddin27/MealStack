-- MealStack migration 002
-- Production-grade inventory lots, atomic cooking, real waste events,
-- shopping lists, immutable usage snapshots, and catalog RLS.

BEGIN;

-- ---------------------------------------------------------------------------
-- Catalog ownership and inventory lots
-- ---------------------------------------------------------------------------

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_global_name
  ON ingredients(LOWER(name)) WHERE owner_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_owner_name
  ON ingredients(owner_id, LOWER(name)) WHERE owner_id IS NOT NULL;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_inventory
  ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS storage_location TEXT NOT NULL DEFAULT 'fridge',
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS initial_quantity_base NUMERIC(12, 3);

UPDATE user_inventory
SET quantity_base = quantity * CASE unit
  WHEN 'kg' THEN 1000
  WHEN 'l' THEN 1000
  WHEN 'tsp' THEN 5
  WHEN 'tbsp' THEN 15
  WHEN 'cup' THEN 240
  ELSE 1
END
WHERE quantity_base IS NULL;

UPDATE user_inventory
SET initial_quantity_base = quantity_base
WHERE initial_quantity_base IS NULL;

ALTER TABLE user_inventory
  ALTER COLUMN initial_quantity_base SET NOT NULL,
  DROP CONSTRAINT IF EXISTS user_inventory_user_id_ingredient_id_key;

ALTER TABLE user_inventory
  DROP CONSTRAINT IF EXISTS user_inventory_unit_check;
ALTER TABLE user_inventory
  ADD CONSTRAINT user_inventory_unit_check
  CHECK (unit IN ('g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup'));

ALTER TABLE ingredients
  DROP CONSTRAINT IF EXISTS ingredients_default_unit_check;
UPDATE ingredients
SET default_unit = CASE
  WHEN default_unit IN ('g', 'kg') THEN 'g'
  WHEN default_unit IN ('ml', 'l', 'tsp', 'tbsp', 'cup') THEN 'ml'
  ELSE 'pcs'
END;
ALTER TABLE ingredients
  ADD CONSTRAINT ingredients_default_unit_check
  CHECK (default_unit IN ('g', 'ml', 'pcs'));

ALTER TABLE recipe_ingredients
  DROP CONSTRAINT IF EXISTS recipe_ingredients_unit_check;
ALTER TABLE recipe_ingredients
  ADD CONSTRAINT recipe_ingredients_unit_check
  CHECK (unit IN ('g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup'));

CREATE INDEX IF NOT EXISTS idx_inventory_fifo
  ON user_inventory(user_id, ingredient_id, expires_at, purchased_at);

-- Ensure normalization is also enforced for recipe ingredients.
DROP TRIGGER IF EXISTS trg_normalize_recipe_ingredients ON recipe_ingredients;
CREATE TRIGGER trg_normalize_recipe_ingredients
  BEFORE INSERT OR UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION normalize_quantity();

-- ---------------------------------------------------------------------------
-- Immutable events and usage snapshots
-- ---------------------------------------------------------------------------

ALTER TABLE cooking_history
  ADD COLUMN IF NOT EXISTS ingredient_value_used NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rescued_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_rescued INT NOT NULL DEFAULT 0;

UPDATE cooking_history
SET ingredient_value_used = COALESCE(money_saved, 0)
WHERE ingredient_value_used = 0;

CREATE TABLE IF NOT EXISTS cooking_ingredient_usage (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cooking_history_id    UUID NOT NULL REFERENCES cooking_history(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_lot_id      UUID REFERENCES user_inventory(id) ON DELETE SET NULL,
  ingredient_id         UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name       TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('grain', 'dairy', 'protein', 'veg', 'spice')),
  quantity_base         NUMERIC(12, 3) NOT NULL CHECK (quantity_base > 0),
  value_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expires_at            TIMESTAMPTZ,
  was_at_risk           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_lot_id      UUID REFERENCES user_inventory(id) ON DELETE SET NULL,
  ingredient_id         UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  cooking_history_id    UUID REFERENCES cooking_history(id) ON DELETE SET NULL,
  ingredient_name       TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('grain', 'dairy', 'protein', 'veg', 'spice')),
  event_type            TEXT NOT NULL CHECK (event_type IN ('consumed', 'discarded', 'donated', 'expired')),
  quantity_base         NUMERIC(12, 3) NOT NULL CHECK (quantity_base > 0),
  value_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  was_at_risk           BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_events_user_date
  ON inventory_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cooking_usage_history
  ON cooking_ingredient_usage(cooking_history_id);

-- ---------------------------------------------------------------------------
-- Shopping list
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shopping_list (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id   UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name TEXT NOT NULL,
  quantity_base   NUMERIC(12, 3) NOT NULL CHECK (quantity_base > 0),
  unit            TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'pcs')),
  checked         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_user
  ON shopping_list(user_id, checked, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS for every exposed table
-- ---------------------------------------------------------------------------

ALTER TABLE ingredients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_ingredient_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read visible ingredients" ON ingredients;
CREATE POLICY "Authenticated users read visible ingredients"
  ON ingredients FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Users create own ingredients" ON ingredients;
CREATE POLICY "Users create own ingredients"
  ON ingredients FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users update own ingredients" ON ingredients;
CREATE POLICY "Users update own ingredients"
  ON ingredients FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own ingredients" ON ingredients;
CREATE POLICY "Users delete own ingredients"
  ON ingredients FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users read visible recipes" ON recipes;
CREATE POLICY "Authenticated users read visible recipes"
  ON recipes FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Users create own recipes" ON recipes;
CREATE POLICY "Users create own recipes"
  ON recipes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users update own recipes" ON recipes;
CREATE POLICY "Users update own recipes"
  ON recipes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own recipes" ON recipes;
CREATE POLICY "Users delete own recipes"
  ON recipes FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users read visible recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Authenticated users read visible recipe ingredients"
  ON recipe_ingredients FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.id = recipe_id AND (r.owner_id IS NULL OR r.owner_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users manage own recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users manage own recipe ingredients"
  ON recipe_ingredients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own cooking usage" ON cooking_ingredient_usage;
CREATE POLICY "Users read own cooking usage"
  ON cooking_ingredient_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own inventory events" ON inventory_events;
CREATE POLICY "Users read own inventory events"
  ON inventory_events FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own shopping list" ON shopping_list;
CREATE POLICY "Users read own shopping list"
  ON shopping_list FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own shopping list" ON shopping_list;
CREATE POLICY "Users insert own shopping list"
  ON shopping_list FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own shopping list" ON shopping_list;
CREATE POLICY "Users update own shopping list"
  ON shopping_list FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own shopping list" ON shopping_list;
CREATE POLICY "Users delete own shopping list"
  ON shopping_list FOR DELETE TO authenticated USING (user_id = auth.uid());

-- User-owned rows may only retain the current user's id after updates.
DROP POLICY IF EXISTS "Users update own inventory" ON user_inventory;
CREATE POLICY "Users update own inventory"
  ON user_inventory FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Unit helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION unit_factor(p_unit TEXT)
RETURNS NUMERIC
LANGUAGE SQL IMMUTABLE STRICT
AS $$
  SELECT CASE p_unit
    WHEN 'kg' THEN 1000
    WHEN 'l' THEN 1000
    WHEN 'tsp' THEN 5
    WHEN 'tbsp' THEN 15
    WHEN 'cup' THEN 240
    ELSE 1
  END::NUMERIC;
$$;

CREATE OR REPLACE FUNCTION unit_dimension(p_unit TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE STRICT
AS $$
  SELECT CASE
    WHEN p_unit IN ('g', 'kg') THEN 'mass'
    WHEN p_unit IN ('ml', 'l', 'tsp', 'tbsp', 'cup') THEN 'volume'
    WHEN p_unit = 'pcs' THEN 'count'
    ELSE 'invalid'
  END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic cooking RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cook_recipe(
  p_recipe_id UUID,
  p_servings INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_base_servings INT;
  v_servings INT;
  v_multiplier NUMERIC;
  v_required NUMERIC;
  v_available NUMERIC;
  v_take NUMERIC;
  v_remaining NUMERIC;
  v_unit_value NUMERIC;
  v_value NUMERIC;
  v_total_value NUMERIC := 0;
  v_rescued_value NUMERIC := 0;
  v_items_rescued INT := 0;
  v_history_id UUID;
  v_recipe_ingredient RECORD;
  v_lot RECORD;
  v_at_risk BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT servings INTO v_base_servings
  FROM recipes
  WHERE id = p_recipe_id
    AND (owner_id IS NULL OR owner_id = v_user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipe not found' USING ERRCODE = 'P0002';
  END IF;

  v_base_servings := GREATEST(COALESCE(v_base_servings, 1), 1);
  v_servings := COALESCE(p_servings, v_base_servings);
  IF v_servings < 1 OR v_servings > 100 THEN
    RAISE EXCEPTION 'Servings must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  v_multiplier := v_servings::NUMERIC / v_base_servings::NUMERIC;

  -- Validate and lock every required inventory lot before any mutation.
  FOR v_recipe_ingredient IN
    SELECT ri.ingredient_id, ri.quantity_base, ri.unit, i.name, i.default_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = p_recipe_id
    ORDER BY ri.ingredient_id
  LOOP
    IF unit_dimension(v_recipe_ingredient.unit) <> unit_dimension(v_recipe_ingredient.default_unit) THEN
      RAISE EXCEPTION 'Recipe has incompatible units for %', v_recipe_ingredient.name
        USING ERRCODE = '22023';
    END IF;

    v_required := v_recipe_ingredient.quantity_base * v_multiplier;

    PERFORM id
    FROM user_inventory
    WHERE user_id = v_user_id
      AND ingredient_id = v_recipe_ingredient.ingredient_id
      AND expires_at > NOW()
      AND quantity_base > 0
    ORDER BY expires_at, purchased_at, id
    FOR UPDATE;

    SELECT COALESCE(SUM(quantity_base), 0) INTO v_available
    FROM user_inventory
    WHERE user_id = v_user_id
      AND ingredient_id = v_recipe_ingredient.ingredient_id
      AND expires_at > NOW()
      AND quantity_base > 0;

    IF v_available < v_required THEN
      RAISE EXCEPTION 'Insufficient %: need %, available %',
        v_recipe_ingredient.name, v_required, v_available
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  INSERT INTO cooking_history (
    user_id, recipe_id, servings_made, money_saved,
    ingredient_value_used, rescued_value, items_rescued
  ) VALUES (
    v_user_id, p_recipe_id, v_servings, 0, 0, 0, 0
  ) RETURNING id INTO v_history_id;

  -- Deduct earliest-expiring lots first and snapshot every quantity/value used.
  FOR v_recipe_ingredient IN
    SELECT ri.ingredient_id, ri.quantity_base, i.name, i.category, i.price_per_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = p_recipe_id
    ORDER BY ri.ingredient_id
  LOOP
    v_required := v_recipe_ingredient.quantity_base * v_multiplier;

    FOR v_lot IN
      SELECT ui.*
      FROM user_inventory ui
      WHERE ui.user_id = v_user_id
        AND ui.ingredient_id = v_recipe_ingredient.ingredient_id
        AND ui.expires_at > NOW()
        AND ui.quantity_base > 0
      ORDER BY ui.expires_at, ui.purchased_at, ui.id
      FOR UPDATE
    LOOP
      EXIT WHEN v_required <= 0;
      v_take := LEAST(v_required, v_lot.quantity_base);
      v_remaining := v_lot.quantity_base - v_take;
      v_unit_value := COALESCE(
        v_lot.purchase_price / NULLIF(v_lot.initial_quantity_base, 0),
        v_recipe_ingredient.price_per_unit,
        0
      );
      v_value := ROUND(v_take * v_unit_value, 2);
      v_at_risk := v_lot.expires_at <= NOW() + INTERVAL '48 hours';

      INSERT INTO cooking_ingredient_usage (
        cooking_history_id, user_id, inventory_lot_id, ingredient_id,
        ingredient_name, category, quantity_base, value_amount,
        expires_at, was_at_risk
      ) VALUES (
        v_history_id, v_user_id, v_lot.id, v_recipe_ingredient.ingredient_id,
        v_recipe_ingredient.name, v_recipe_ingredient.category, v_take, v_value,
        v_lot.expires_at, v_at_risk
      );

      INSERT INTO inventory_events (
        user_id, inventory_lot_id, ingredient_id, cooking_history_id,
        ingredient_name, category, event_type, quantity_base,
        value_amount, was_at_risk
      ) VALUES (
        v_user_id, v_lot.id, v_recipe_ingredient.ingredient_id, v_history_id,
        v_recipe_ingredient.name, v_recipe_ingredient.category, 'consumed',
        v_take, v_value, v_at_risk
      );

      v_total_value := v_total_value + v_value;
      IF v_at_risk THEN
        v_rescued_value := v_rescued_value + v_value;
        v_items_rescued := v_items_rescued + 1;
      END IF;

      IF v_remaining <= 0 THEN
        DELETE FROM user_inventory WHERE id = v_lot.id;
      ELSE
        UPDATE user_inventory
        SET quantity = ROUND(v_remaining / unit_factor(v_lot.unit), 3),
            quantity_base = v_remaining
        WHERE id = v_lot.id;
      END IF;

      v_required := v_required - v_take;
    END LOOP;
  END LOOP;

  UPDATE cooking_history
  SET ingredient_value_used = ROUND(v_total_value, 2),
      rescued_value = ROUND(v_rescued_value, 2),
      items_rescued = v_items_rescued,
      money_saved = ROUND(v_rescued_value, 2)
  WHERE id = v_history_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'history_id', v_history_id,
    'servings', v_servings,
    'ingredient_value_used', ROUND(v_total_value, 2),
    'rescued_value', ROUND(v_rescued_value, 2),
    'items_rescued', v_items_rescued
  );
END;
$$;

-- Records a real inventory outcome and adjusts a lot in the same transaction.
CREATE OR REPLACE FUNCTION record_inventory_event(
  p_inventory_id UUID,
  p_event_type TEXT,
  p_quantity_base NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_lot RECORD;
  v_take NUMERIC;
  v_remaining NUMERIC;
  v_unit_value NUMERIC;
  v_value NUMERIC;
  v_at_risk BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_event_type NOT IN ('consumed', 'discarded', 'donated', 'expired') THEN
    RAISE EXCEPTION 'Unsupported inventory event' USING ERRCODE = '22023';
  END IF;

  SELECT ui.*, i.name AS ingredient_name, i.category, i.price_per_unit
  INTO v_lot
  FROM user_inventory ui
  JOIN ingredients i ON i.id = ui.ingredient_id
  WHERE ui.id = p_inventory_id AND ui.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory lot not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_event_type = 'expired' AND v_lot.expires_at > NOW() THEN
    RAISE EXCEPTION 'This lot has not expired yet' USING ERRCODE = '22023';
  END IF;

  v_take := COALESCE(p_quantity_base, v_lot.quantity_base);
  IF v_take <= 0 OR v_take > v_lot.quantity_base THEN
    RAISE EXCEPTION 'Event quantity exceeds available inventory' USING ERRCODE = '22023';
  END IF;

  v_remaining := v_lot.quantity_base - v_take;
  v_unit_value := COALESCE(
    v_lot.purchase_price / NULLIF(v_lot.initial_quantity_base, 0),
    v_lot.price_per_unit,
    0
  );
  v_value := ROUND(v_take * v_unit_value, 2);
  v_at_risk := v_lot.expires_at <= NOW() + INTERVAL '48 hours';

  INSERT INTO inventory_events (
    user_id, inventory_lot_id, ingredient_id, ingredient_name, category,
    event_type, quantity_base, value_amount, was_at_risk
  ) VALUES (
    v_user_id, v_lot.id, v_lot.ingredient_id, v_lot.ingredient_name,
    v_lot.category, p_event_type, v_take, v_value, v_at_risk
  );

  IF v_remaining <= 0 THEN
    DELETE FROM user_inventory WHERE id = v_lot.id;
  ELSE
    UPDATE user_inventory
    SET quantity = ROUND(v_remaining / unit_factor(v_lot.unit), 3),
        quantity_base = v_remaining
    WHERE id = v_lot.id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'event_type', p_event_type,
    'quantity_base', v_take,
    'value_amount', v_value,
    'remaining_base', v_remaining
  );
END;
$$;

REVOKE ALL ON FUNCTION cook_recipe(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cook_recipe(UUID, INT) TO authenticated;
REVOKE ALL ON FUNCTION record_inventory_event(UUID, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_inventory_event(UUID, TEXT, NUMERIC) TO authenticated;

COMMIT;
