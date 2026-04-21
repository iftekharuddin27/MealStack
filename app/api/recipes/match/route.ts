// ============================================================
// MealStack · GET /api/recipes/match
// Runs the Subset Matcher server-side and returns matched /
// unmatched recipe lists for the authenticated user.
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { subsetMatcher } from '@/lib/subsetMatcher';
import type { InventoryItemFlat, Recipe, Unit, Category } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user inventory
  const { data: invData, error: invErr } = await supabase
    .from('user_inventory')
    .select(`
      id, quantity, unit, quantity_base, expires_at,
      ingredients ( name, category, price_per_unit )
    `)
    .eq('user_id', user.id);

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const inventory: InventoryItemFlat[] = (invData ?? []).map((row: any) => ({
    id: row.id,
    name: row.ingredients.name,
    qty: row.quantity,
    unit: row.unit as Unit,
    quantity_base: row.quantity_base,
    category: row.ingredients.category as Category,
    expires_at: row.expires_at,
    price_per_unit: row.ingredients.price_per_unit ?? 0,
  }));

  // Fetch all recipes with ingredients
  const { data: recipesData, error: recErr } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients (
        id, quantity, unit, quantity_base,
        ingredient:ingredients ( id, name, category, default_unit, price_per_unit )
      )
    `);

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });

  const recipes = (recipesData ?? []) as Recipe[];

  // Run the Subset Matcher algorithm
  const result = subsetMatcher(recipes, inventory);

  return NextResponse.json({
    matched: result.matched,
    unmatched: result.unmatched.map((u) => ({
      recipe: u.recipe,
      missing: u.missing,
    })),
  });
}
