// ============================================================
// MealStack · Recipe Feed Page
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RecipeFeed from '@/components/recipes/RecipeFeed';

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div>
      <div className="border-b border-border bg-background-2 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="font-head text-2xl sm:text-3xl tracking-tight">
          Recipe <em className="text-accent not-italic">Feed</em>
        </h1>
        <p className="mt-1 font-mono text-xs text-subtle">
          Only recipes you can cook right now · Powered by Subset Matcher™
        </p>
      </div>
      <div className="p-4 sm:p-6 lg:p-8">
        <RecipeFeed />
      </div>
    </div>
  );
}
