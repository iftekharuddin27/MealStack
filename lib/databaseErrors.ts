export interface DatabaseErrorLike {
  code?: string | null;
  message?: string | null;
}

const OUTDATED_SCHEMA_CODES = new Set(['42703', '42P01', '42883', 'PGRST202', 'PGRST204', 'PGRST205']);

export const DATABASE_UPDATE_MESSAGE =
  'The database is not updated for this version of MealStack. Apply migration 002_professional_workflows.sql and reload.';

export function isOutdatedSchemaError(error: DatabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code && OUTDATED_SCHEMA_CODES.has(error.code)) return true;

  const message = error.message?.toLowerCase() ?? '';
  return (
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('could not find the function')
  );
}

export function databaseErrorMessage(
  error: DatabaseErrorLike | null | undefined,
  fallback = 'The database request failed.'
): string {
  if (isOutdatedSchemaError(error)) return DATABASE_UPDATE_MESSAGE;
  return error?.message || fallback;
}
