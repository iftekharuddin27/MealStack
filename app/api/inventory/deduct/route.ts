import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCookRequest, ValidationError, validationMessage } from '@/lib/apiValidation';
import { databaseErrorMessage, isOutdatedSchemaError } from '@/lib/databaseErrors';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = parseCookRequest(await req.json());
    const { data, error } = await supabase.rpc('cook_recipe', {
      p_recipe_id: input.recipe_id,
      p_servings: input.servings ?? null,
    });

    if (error) {
      const setupRequired = isOutdatedSchemaError(error);
      const conflict = error.code === '22023' || /insufficient/i.test(error.message);
      return NextResponse.json(
        {
          error: databaseErrorMessage(error),
          code: setupRequired ? 'setup_required' : conflict ? 'insufficient_inventory' : 'cook_failed',
        },
        { status: setupRequired ? 503 : conflict ? 409 : 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: validationMessage(error) },
      { status: error instanceof ValidationError ? 400 : 500 }
    );
  }
}
