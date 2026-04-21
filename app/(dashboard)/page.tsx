// ============================================================
// MealStack · Dashboard Page (Kitchen Status)
// Server Component — fetches initial data, renders client widgets.
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KitchenStatus from '@/components/layout/KitchenStatus';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <KitchenStatus />;
}
