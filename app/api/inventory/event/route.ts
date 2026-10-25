import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseInventoryEvent, ValidationError, validationMessage } from '@/lib/apiValidation';
import { databaseErrorMessage, isOutdatedSchemaError } from '@/lib/databaseErrors';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = parseInventoryEvent(await req.json());
    const { data, error } = await supabase.rpc('record_inventory_event', {
      p_inventory_id: input.inventory_id,
      p_event_type: input.event_type,
      p_quantity_base: input.quantity_base ?? null,
    });
    if (error) {
      const setupRequired = isOutdatedSchemaError(error);
      const status = setupRequired ? 503 : error.code === '22023' ? 409 : error.code === 'P0002' ? 404 : 500;
      return NextResponse.json(
        { error: databaseErrorMessage(error), code: setupRequired ? 'setup_required' : 'event_failed' },
        { status }
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
