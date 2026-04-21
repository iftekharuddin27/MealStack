-- ============================================================
-- MealStack Seed Data · Supabase PostgreSQL
-- ============================================================

-- INGREDIENTS CATALOG
INSERT INTO ingredients (name, category, default_unit, price_per_unit) VALUES
  ('Basmati Rice',        'grain',   'g',   0.12),
  ('All-Purpose Flour',   'grain',   'g',   0.09),
  ('Spaghetti',           'grain',   'g',   0.22),
  ('Oats',                'grain',   'g',   0.15),
  ('Whole Milk',          'dairy',   'ml',  0.06),
  ('Cheddar Cheese',      'dairy',   'g',   1.20),
  ('Butter',              'dairy',   'g',   0.80),
  ('Eggs',                'protein', 'pcs', 15.00),
  ('Chicken Breast',      'protein', 'g',   0.67),
  ('Spinach',             'veg',     'g',   0.15),
  ('Garlic',              'veg',     'pcs', 4.00),
  ('Onion',               'veg',     'pcs', 10.00),
  ('Tomato',              'veg',     'g',   0.08),
  ('Tea Leaf',            'spice',   'g',   0.30),
  ('Sugar',               'spice',   'g',   0.07),
  ('Olive oil',           'spice',   'ml',  0.20),
  ('Cumin',               'spice',   'g',   0.50),
  ('Turmeric',            'spice',   'g',   0.40),
  ('Salt',                'spice',   'g',   0.02),
  ('Black Pepper',        'spice',   'g',   1.20);

-- RECIPES
INSERT INTO recipes (id, name, description, emoji, time_minutes, servings, difficulty) VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Egg Fried Rice',      'Classic wok-style fried rice with scrambled egg and garlic butter.', '🍳', 20, 2, 'easy'),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Cheesy Pasta',         'Creamy cheddar pasta — comfort food in 25 minutes.',                 '🍝', 25, 2, 'easy'),
  ('a1b2c3d4-0003-0000-0000-000000000003', 'Spiced Milk Oats',     'Warm oats with turmeric and cumin — a zero-waste breakfast.',        '🥣', 10, 1, 'easy'),
  ('a1b2c3d4-0004-0000-0000-000000000004', 'Chicken Rice Bowl',    'Spiced chicken thigh on fluffy basmati with garlic.',                '🍚', 35, 2, 'medium'),
  ('a1b2c3d4-0005-0000-0000-000000000005', 'Spinach Omelette',     'Protein-packed omelette with wilted spinach and butter.',            '🥬', 15, 1, 'easy'),
  ('a1b2c3d4-0006-0000-0000-000000000006', 'Milk Tea',             'Quick stovetop milk tea with tea leaf and sugar.',                   '☕', 8,  2, 'easy'),
  ('a1b2c3d4-0007-0000-0000-000000000007', 'Egg Fry',              'Simple pan-fried egg with oil and salt.',                            '🍳', 6,  1, 'easy');

-- RECIPE INGREDIENTS
-- Egg Fried Rice
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0001-0000-0000-000000000001', id, 300,  'g',   300  FROM ingredients WHERE name = 'Basmati Rice';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0001-0000-0000-000000000001', id, 3,    'pcs', 3    FROM ingredients WHERE name = 'Eggs';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0001-0000-0000-000000000001', id, 2,    'pcs', 2    FROM ingredients WHERE name = 'Garlic';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0001-0000-0000-000000000001', id, 20,   'g',   20   FROM ingredients WHERE name = 'Butter';

-- Cheesy Pasta
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0002-0000-0000-000000000002', id, 200,  'g',   200  FROM ingredients WHERE name = 'Spaghetti';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0002-0000-0000-000000000002', id, 80,   'g',   80   FROM ingredients WHERE name = 'Cheddar Cheese';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0002-0000-0000-000000000002', id, 30,   'g',   30   FROM ingredients WHERE name = 'Butter';

-- Spiced Milk Oats
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0003-0000-0000-000000000003', id, 100,  'g',   100  FROM ingredients WHERE name = 'Oats';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0003-0000-0000-000000000003', id, 200,  'ml',  200  FROM ingredients WHERE name = 'Whole Milk';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0003-0000-0000-000000000003', id, 5,    'g',   5    FROM ingredients WHERE name = 'Cumin';

-- Chicken Rice Bowl
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0004-0000-0000-000000000004', id, 300,  'g',   300  FROM ingredients WHERE name = 'Chicken Breast';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0004-0000-0000-000000000004', id, 0.4,  'kg',  400  FROM ingredients WHERE name = 'Basmati Rice';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0004-0000-0000-000000000004', id, 3,    'pcs', 3    FROM ingredients WHERE name = 'Garlic';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0004-0000-0000-000000000004', id, 10,   'g',   10   FROM ingredients WHERE name = 'Cumin';

-- Spinach Omelette
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0005-0000-0000-000000000005', id, 3,    'pcs', 3    FROM ingredients WHERE name = 'Eggs';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0005-0000-0000-000000000005', id, 150,  'g',   150  FROM ingredients WHERE name = 'Spinach';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0005-0000-0000-000000000005', id, 15,   'g',   15   FROM ingredients WHERE name = 'Butter';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0005-0000-0000-000000000005', id, 1,    'pcs', 1    FROM ingredients WHERE name = 'Garlic';

-- Milk Tea
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0006-0000-0000-000000000006', id, 250,  'ml',  250  FROM ingredients WHERE name = 'Whole Milk';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0006-0000-0000-000000000006', id, 6,    'g',   6    FROM ingredients WHERE name = 'Tea Leaf';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0006-0000-0000-000000000006', id, 10,   'g',   10   FROM ingredients WHERE name = 'Sugar';

-- Egg Fry
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0007-0000-0000-000000000007', id, 2,    'pcs', 2    FROM ingredients WHERE name = 'Eggs';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0007-0000-0000-000000000007', id, 10,   'ml',  10   FROM ingredients WHERE name = 'Olive oil';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, quantity_base)
SELECT 'a1b2c3d4-0007-0000-0000-000000000007', id, 2,    'g',   2    FROM ingredients WHERE name = 'Salt';
