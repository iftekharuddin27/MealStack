// ============================================================
// MealStack · POST /api/inventory/deduct
// Auto-deduction: subtracts recipe ingredient quantities from
// user_inventory and logs the cook to cooking_history.
//
// Body: { recipe_id: string }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toBase } from '@/lib/unitNormalizer';
import { ingredientNamesMatch } from '@/lib/ingredientAliases';
import type { Unit } from '@/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { recipe_id } = body as { recipe_id: string };

  if (!recipe_id) {
    return NextResponse.json({ error: 'recipe_id required' }, { status: 400 });
  }

  // 1. Fetch recipe with its ingredients
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .select(`
      id, name, servings,
      recipe_ingredients (
        quantity, unit, quantity_base,
        ingredient:ingredients ( id, name, price_per_unit )
      )
    `)
    .eq('id', recipe_id)
    .single();

  if (recipeErr || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const recipeIngredients: any[] = recipe.recipe_ingredients;
  let totalMoneySaved = 0;

  const { data: userInventoryRows, error: invErr } = await supabase
    .from('user_inventory')
    .select(`
      id, ingredient_id, quantity, unit, quantity_base,
      ingredients ( name )
    `)
    .eq('user_id', user.id);

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  const workingRows = (userInventoryRows ?? []).map((row: any) => ({
    id: row.id,
    ingredient_id: row.ingredient_id,
    quantity: row.quantity,
    unit: row.unit,
    quantity_base: row.quantity_base,
    ingredient_name: row.ingredients?.name ?? '',
  }));

  // 2. For each ingredient, fetch user's inventory row and deduct
  const updates = recipeIngredients.map(async (ri) => {
    const deductBase = toBase(ri.quantity, ri.unit as Unit);
    const ingredientId = ri.ingredient.id;

    const invRow =
      workingRows.find((row) => row.ingredient_id === ingredientId) ??
      workingRows.find((row) => ingredientNamesMatch(row.ingredient_name, ri.ingredient.name));

    if (!invRow) return;

    const newBase = Math.max(0, (invRow.quantity_base ?? 0) - deductBase);
    const factor = toBase(1, invRow.unit as Unit);
    const newQty = Math.round((newBase / factor) * 1000) / 1000;

    await supabase
      .from('user_inventory')
      .update({ quantity: newQty, quantity_base: newBase })
      .eq('id', invRow.id);

    invRow.quantity = newQty;
    invRow.quantity_base = newBase;

    // Accumulate money saved (ingredients used = money not wasted)
    const pricePerBase = ri.ingredient.price_per_unit ?? 0;
    totalMoneySaved += deductBase * pricePerBase;
  });

  await Promise.all(updates);

  // 3. Log to cooking_history for Waste Analytics
  await supabase.from('cooking_history').insert({
    user_id: user.id,
    recipe_id,
    money_saved: Math.round(totalMoneySaved * 100) / 100,
    servings_made: recipe.servings ?? 2,
  });

  return NextResponse.json({ success: true, money_saved: totalMoneySaved });
}
