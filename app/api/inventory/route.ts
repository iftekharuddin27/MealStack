// ============================================================
// MealStack · GET, POST, DELETE /api/inventory
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assignExpiry } from '@/lib/expiryLogic';
import { toBase } from '@/lib/unitNormalizer';
import { ingredientNamesMatch } from '@/lib/ingredientAliases';

function mapDbError(error: { code?: string; message?: string }) {
  if (error?.code === 'PGRST205') {
    return NextResponse.json(
      {
        error: 'Database tables are missing. Run Supabase migrations first.',
        code: 'setup_required',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: error.message ?? 'Database error' }, { status: 500 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_inventory')
    .select(`
      id, quantity, unit, quantity_base, expires_at, added_at,
      ingredients ( id, name, category, default_unit, price_per_unit )
    `)
    .eq('user_id', user.id)
    .order('expires_at', { ascending: true });

  if (error) {
    console.error('DB_ERROR:', error);
    return mapDbError(error);
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { ingredient_name, quantity, unit, category } = body;

  if (!ingredient_name || !quantity || !unit || !category) {
    return NextResponse.json({ error: 'ingredient_name, quantity, unit, category are required' }, { status: 400 });
  }

  const { data: ingredientData, error: findError } = await supabase
    .from('ingredients')
    .select('id, name');

  if (findError) {
    return mapDbError(findError);
  }

  let ingredient = (ingredientData ?? []).find((ing) =>
    ingredientNamesMatch(ing.name, ingredient_name)
  ) ?? null;

  if (!ingredient) {
    const { data: newIng, error: ingError } = await supabase
      .from('ingredients')
      .insert({ name: ingredient_name, category, default_unit: unit })
      .select('id, name')
      .single();
    
    if (ingError) {
      console.error('ingError:', ingError);
      return mapDbError(ingError);
    }
    ingredient = newIng;
  }

  const expires_at = assignExpiry(category).toISOString();
  
  // Try to find if user already has this ingredient
  const { data: existingData, error: existingErr } = await supabase
    .from('user_inventory')
    .select('id')
    .eq('user_id', user.id)
    .eq('ingredient_id', ingredient!.id)
    .limit(1);

  if (existingErr) {
    return mapDbError(existingErr);
  }
    
  const existing = existingData && existingData.length > 0 ? existingData[0] : null;
    
  let mutation;
  if (existing) {
    mutation = supabase
      .from('user_inventory')
      .update({
        quantity,
        unit,
        quantity_base: toBase(quantity, unit),
        expires_at
      })
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    mutation = supabase
      .from('user_inventory')
      .insert({
        user_id: user.id,
        ingredient_id: ingredient!.id,
        quantity,
        unit,
        quantity_base: toBase(quantity, unit),
        expires_at
      })
      .select()
      .single();
  }

  const { data, error } = await mutation;

  if (error) return mapDbError(error);
  return NextResponse.json({ data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('user_inventory')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('mutation error: ', error);
    return mapDbError(error);
  }
  return NextResponse.json({ success: true });
}
