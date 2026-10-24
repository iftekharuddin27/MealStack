// ============================================================
// MealStack · Supabase Browser Client
// Used in Client Components and TanStack Query hooks.
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.'
    );
  }

  return { url, anonKey };
}

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();

  return createBrowserClient(
    url,
    anonKey
  );
}

// Singleton for use outside React (e.g., TanStack Query fetchers)
export const supabase = createClient();
