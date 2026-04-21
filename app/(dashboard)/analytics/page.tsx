// ============================================================
// MealStack · Waste Analytics Page
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SavingsChart from '@/components/analytics/SavingsChart';
import WasteDonut from '@/components/analytics/WasteDonut';
import AnalyticsStats from '@/components/analytics/AnalyticsStats';
import WeeklyTrend from '@/components/analytics/WeeklyTrend';
import WeeklyCookedList from '@/components/analytics/WeeklyCookedList';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div>
      <div className="border-b border-border bg-background-2 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="font-head text-2xl sm:text-3xl tracking-tight">
          Waste <em className="text-accent not-italic">Analytics</em>
        </h1>
        <p className="mt-1 font-mono text-xs text-subtle">
          Money saved by not letting food expire · 30-day rolling view
        </p>
      </div>
      <div className="p-4 space-y-6 sm:p-6 sm:space-y-8 lg:p-8">
        <AnalyticsStats />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SavingsChart />
          <WasteDonut />
        </div>
        <WeeklyCookedList />
        <WeeklyTrend />
      </div>
    </div>
  );
}
