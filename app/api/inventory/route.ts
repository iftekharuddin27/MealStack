import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ingredientNamesMatch } from '@/lib/ingredientAliases';
import { areUnitsCompatible, getBaseUnit, toBase } from '@/lib/unitNormalizer';
import {
  parseAddInventory,
  parseUpdateInventory,
  ValidationError,
  validationMessage,
} from '@/lib/apiValidation';
import type { Unit } from '@/types';
import { databaseErrorMessage, isOutdatedSchemaError } from '@/lib/databaseErrors';

function mapDbError(error: { code?: string; message?: string }) {
  if (isOutdatedSchemaError(error)) {
    return NextResponse.json(
      { error: databaseErrorMessage(error), code: 'setup_required' },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: error.message ?? 'Database error' }, { status: 500 });
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_inventory')
    .select(`
      id, quantity, unit, quantity_base, initial_quantity_base,
      expires_at, added_at, purchased_at, storage_location, purchase_price,
      ingredients ( id, name, category, default_unit, price_per_unit )
    `)
    .eq('user_id', user.id)
    .order('expires_at', { ascending: true });

  if (error && isOutdatedSchemaError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('user_inventory')
      .select(`
        id, quantity, unit, quantity_base, expires_at, added_at,
        ingredients ( id, name, category, default_unit, price_per_unit )
      `)
      .eq('user_id', user.id)
      .order('expires_at', { ascending: true });

    if (legacyError) return mapDbError(legacyError);
    return NextResponse.json({ data: legacyData, schema_version: 'legacy' });
  }
  if (error) return mapDbError(error);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = parseAddInventory(await req.json());
    const purchasedAt = input.purchased_at ?? new Date().toISOString();
    if (new Date(input.expires_at) <= new Date(purchasedAt)) {
      throw new ValidationError('Expiry must be later than the purchase date.');
    }

    const { data: ingredientData, error: findError } = await supabase
      .from('ingredients')
      .select('id, name, category, default_unit');
    if (findError) return mapDbError(findError);

    let ingredient = (ingredientData ?? []).find((item) =>
      ingredientNamesMatch(item.name, input.ingredient_name)
    ) ?? null;

    if (!ingredient) {
      let { data, error } = await supabase
        .from('ingredients')
        .insert({
          name: input.ingredient_name,
          category: input.category,
          default_unit: getBaseUnit(input.unit),
          price_per_unit: 0,
          owner_id: user.id,
        })
        .select('id, name, category, default_unit')
        .single();

      if (error && isOutdatedSchemaError(error)) {
        const legacyInsert = await supabase
          .from('ingredients')
          .insert({
            name: input.ingredient_name,
            category: input.category,
            default_unit: getBaseUnit(input.unit),
            price_per_unit: 0,
          })
          .select('id, name, category, default_unit')
          .single();
        data = legacyInsert.data;
        error = legacyInsert.error;
      }
      if (error) return mapDbError(error);
      ingredient = data;
    }

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient could not be created.' }, { status: 500 });
    }

    if (!areUnitsCompatible(input.unit, ingredient.default_unit as Unit)) {
      throw new ValidationError(
        `${ingredient.name} must use units compatible with ${ingredient.default_unit}.`
      );
    }

    const quantityBase = toBase(input.quantity, input.unit);
    let { data, error } = await supabase
      .from('user_inventory')
      .insert({
        user_id: user.id,
        ingredient_id: ingredient.id,
        quantity: input.quantity,
        unit: input.unit,
        quantity_base: quantityBase,
        initial_quantity_base: quantityBase,
        expires_at: input.expires_at,
        purchased_at: purchasedAt,
        storage_location: input.storage_location,
        purchase_price: input.purchase_price,
      })
      .select()
      .single();

    if (error && isOutdatedSchemaError(error)) {
      const { data: existing, error: existingError } = await supabase
        .from('user_inventory')
        .select('id, quantity_base, unit, expires_at')
        .eq('user_id', user.id)
        .eq('ingredient_id', ingredient.id)
        .maybeSingle();
      if (existingError) return mapDbError(existingError);

      const legacyMutation = existing
        ? supabase
            .from('user_inventory')
            .update({
              quantity: (Number(existing.quantity_base) + quantityBase) /
                toBase(1, existing.unit as Unit),
              unit: existing.unit,
              quantity_base: Number(existing.quantity_base) + quantityBase,
              expires_at: new Date(existing.expires_at) < new Date(input.expires_at)
                ? existing.expires_at
                : input.expires_at,
            })
            .eq('id', existing.id)
            .eq('user_id', user.id)
            .select()
            .single()
        : supabase
            .from('user_inventory')
            .insert({
              user_id: user.id,
              ingredient_id: ingredient.id,
              quantity: input.quantity,
              unit: input.unit,
              quantity_base: quantityBase,
              expires_at: input.expires_at,
            })
            .select()
            .single();
      const legacyResult = await legacyMutation;
      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) return mapDbError(error);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = parseUpdateInventory(await req.json());
    let { data: existing, error: readError } = await supabase
      .from('user_inventory')
      .select('id, purchased_at, added_at, ingredients(default_unit)')
      .eq('id', input.id)
      .eq('user_id', user.id)
      .single();

    if (readError && isOutdatedSchemaError(readError)) {
      const legacyRead = await supabase
        .from('user_inventory')
        .select('id, added_at, ingredients(default_unit)')
        .eq('id', input.id)
        .eq('user_id', user.id)
        .single();
      existing = legacyRead.data as typeof existing;
      readError = legacyRead.error;
    }
    if (readError || !existing) {
      return NextResponse.json({ error: 'Inventory lot not found.' }, { status: 404 });
    }

    const ingredient = Array.isArray(existing.ingredients)
      ? existing.ingredients[0]
      : existing.ingredients;
    if (!ingredient || !areUnitsCompatible(input.unit, ingredient.default_unit as Unit)) {
      throw new ValidationError('The selected unit is incompatible with this ingredient.');
    }
    const purchaseDate = existing.purchased_at ?? existing.added_at;
    if (new Date(input.expires_at) <= new Date(purchaseDate)) {
      throw new ValidationError('Expiry must be later than the purchase date.');
    }

    const quantityBase = toBase(input.quantity, input.unit);
    let { data, error } = await supabase
      .from('user_inventory')
      .update({
        quantity: input.quantity,
        unit: input.unit,
        quantity_base: quantityBase,
        initial_quantity_base: quantityBase,
        expires_at: input.expires_at,
        storage_location: input.storage_location,
        purchase_price: input.purchase_price,
      })
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error && isOutdatedSchemaError(error)) {
      const legacyUpdate = await supabase
        .from('user_inventory')
        .update({
          quantity: input.quantity,
          unit: input.unit,
          quantity_base: quantityBase,
          expires_at: input.expires_at,
        })
        .eq('id', input.id)
        .eq('user_id', user.id)
        .select()
        .single();
      data = legacyUpdate.data;
      error = legacyUpdate.error;
    }

    if (error) return mapDbError(error);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('user_inventory')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return mapDbError(error);
  return NextResponse.json({ success: true });
}
