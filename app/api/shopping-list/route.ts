import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseShoppingItem, ValidationError, validationMessage } from '@/lib/apiValidation';
import { ingredientNamesMatch } from '@/lib/ingredientAliases';
import { databaseErrorMessage, isOutdatedSchemaError } from '@/lib/databaseErrors';

function databaseFailure(error: { code?: string; message?: string }) {
  return NextResponse.json(
    {
      error: databaseErrorMessage(error),
      code: isOutdatedSchemaError(error) ? 'setup_required' : 'database_error',
    },
    { status: isOutdatedSchemaError(error) ? 503 : 500 }
  );
}

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function bodyObject(req: Request): Promise<Record<string, unknown>> {
  const body: unknown = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be an object.');
  }
  return body as Record<string, unknown>;
}

export async function GET() {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('shopping_list')
    .select('id, ingredient_id, ingredient_name, quantity_base, unit, checked, created_at')
    .eq('user_id', user.id)
    .order('checked')
    .order('created_at', { ascending: false });
  if (error) return databaseFailure(error);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const input = parseShoppingItem(await req.json());
    const { data: current, error: readError } = await supabase
      .from('shopping_list')
      .select('id, ingredient_name, quantity_base, unit')
      .eq('user_id', user.id)
      .eq('checked', false);
    if (readError) return databaseFailure(readError);

    const existing = (current ?? []).find((item) =>
      item.unit === input.unit && ingredientNamesMatch(item.ingredient_name, input.ingredient_name)
    );
    const mutation = existing
      ? supabase.from('shopping_list').update({
          quantity_base: Number(existing.quantity_base) + input.quantity_base,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id).eq('user_id', user.id).select().single()
      : supabase.from('shopping_list').insert({
          user_id: user.id,
          ingredient_id: input.ingredient_id ?? null,
          ingredient_name: input.ingredient_name,
          quantity_base: input.quantity_base,
          unit: input.unit,
        }).select().single();
    const { data, error } = await mutation;
    if (error) return databaseFailure(error);
    return NextResponse.json({ data }, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await bodyObject(req);
    if (typeof body.id !== 'string' || typeof body.checked !== 'boolean') {
      throw new ValidationError('id and checked are required.');
    }
    const { data, error } = await supabase
      .from('shopping_list')
      .update({ checked: body.checked, updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) return databaseFailure(error);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabase.from('shopping_list').delete().eq('id', id).eq('user_id', user.id);
  if (error) return databaseFailure(error);
  return NextResponse.json({ success: true });
}
