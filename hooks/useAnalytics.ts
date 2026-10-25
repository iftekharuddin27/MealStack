'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { databaseErrorMessage, isOutdatedSchemaError } from '@/lib/databaseErrors';
import type { AnalyticsSummary, Category } from '@/types';

interface InventoryEventRow {
  occurred_at: string;
  event_type: 'consumed' | 'discarded' | 'donated' | 'expired';
  value_amount: number;
  was_at_risk: boolean;
  category: Category;
}

interface HistoryRow {
  cooked_at: string;
  ingredient_value_used: number;
  rescued_value: number;
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function weekLabel(date: Date): string {
  return date.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' });
}

async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  const [eventsResult, historyResult] = await Promise.all([
    supabase
      .from('inventory_events')
      .select('occurred_at, event_type, value_amount, was_at_risk, category')
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('cooking_history')
      .select('cooked_at, ingredient_value_used, rescued_value')
      .gte('cooked_at', since)
      .order('cooked_at', { ascending: false }),
  ]);

  let eventRows = eventsResult.data ?? [];
  let historyRows = historyResult.data ?? [];

  if (eventsResult.error) {
    if (isOutdatedSchemaError(eventsResult.error)) eventRows = [];
    else throw new Error(databaseErrorMessage(eventsResult.error));
  }
  if (historyResult.error && isOutdatedSchemaError(historyResult.error)) {
    const legacyHistory = await supabase
      .from('cooking_history')
      .select('cooked_at, money_saved')
      .gte('cooked_at', since)
      .order('cooked_at', { ascending: false });
    if (legacyHistory.error) throw new Error(databaseErrorMessage(legacyHistory.error));
    historyRows = (legacyHistory.data ?? []).map((row: any) => ({
      cooked_at: row.cooked_at,
      ingredient_value_used: Number(row.money_saved ?? 0),
      rescued_value: Number(row.money_saved ?? 0),
    }));
  } else if (historyResult.error) {
    throw new Error(databaseErrorMessage(historyResult.error));
  }

  const events = eventRows.map((row: any): InventoryEventRow => ({
    occurred_at: row.occurred_at,
    event_type: row.event_type,
    value_amount: Number(row.value_amount ?? 0),
    was_at_risk: Boolean(row.was_at_risk),
    category: row.category as Category,
  }));
  const history = historyRows.map((row: any): HistoryRow => ({
    cooked_at: row.cooked_at,
    ingredient_value_used: Number(row.ingredient_value_used ?? 0),
    rescued_value: Number(row.rescued_value ?? 0),
  }));

  const now = new Date();
  const weekStart = startOfWeek(now);
  const consumed = events.filter((event) => event.event_type === 'consumed');
  const rescued = consumed.filter((event) => event.was_at_risk);
  const wasted = events.filter((event) =>
    event.event_type === 'discarded' || event.event_type === 'expired'
  );
  const donated = events.filter((event) => event.event_type === 'donated');
  const sumValue = (rows: InventoryEventRow[]) =>
    rows.reduce((sum, row) => sum + row.value_amount, 0);

  const categoryMap = new Map<Category, number>();
  for (const event of rescued) {
    categoryMap.set(event.category, (categoryMap.get(event.category) ?? 0) + event.value_amount);
  }

  const weeklyTrend = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - (4 - index) * 7);
    const key = weekKey(date);
    const rows = events.filter((event) => weekKey(new Date(event.occurred_at)) === key);
    return {
      week_label: weekLabel(date),
      rescued: sumValue(rows.filter((event) => event.event_type === 'consumed' && event.was_at_risk)),
      wasted: sumValue(rows.filter((event) =>
        event.event_type === 'discarded' || event.event_type === 'expired'
      )),
      donated: sumValue(rows.filter((event) => event.event_type === 'donated')),
    };
  });

  const consumedValue = sumValue(consumed);
  const wastedValue = sumValue(wasted);
  const donatedValue = sumValue(donated);
  const measuredValue = consumedValue + wastedValue + donatedValue;

  return {
    rescued_value_7d: sumValue(rescued.filter((event) =>
      new Date(event.occurred_at).getTime() >= weekStart.getTime()
    )),
    recipes_cooked_7d: history.filter((entry) =>
      new Date(entry.cooked_at).getTime() >= weekStart.getTime()
    ).length,
    ingredient_value_used_30d: consumedValue,
    rescued_value_30d: sumValue(rescued),
    wasted_value_30d: wastedValue,
    donated_value_30d: donatedValue,
    recipes_cooked_30d: history.length,
    items_rescued: rescued.length,
    waste_rate_pct: measuredValue > 0 ? (wastedValue / measuredValue) * 100 : 0,
    rescued_by_category: Array.from(categoryMap, ([category, rescued_value]) => ({
      category,
      rescued_value,
    })),
    weekly_trend: weeklyTrend,
  };
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
    staleTime: 30_000,
    retry: false,
  });
}
