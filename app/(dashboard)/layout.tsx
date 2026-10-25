// ============================================================
// MealStack · Dashboard Shell Layout
// Sidebar + main area. Renders all (dashboard) routes.
// ============================================================

import Sidebar from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen bg-background md:flex-row flex-col">
      <Sidebar
        initialUser={{
          email: user.email ?? '',
          fullName: user.user_metadata?.full_name || 'User',
        }}
      />
      <main className="flex-1 overflow-y-auto h-screen pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
