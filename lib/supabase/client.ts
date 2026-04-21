// ============================================================
// MealStack · Supabase Browser Client
// Used in Client Components and TanStack Query hooks.
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for use outside React (e.g., TanStack Query fetchers)
export const supabase = createClient();
