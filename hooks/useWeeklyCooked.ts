'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { readCookHistoryFallback } from '@/lib/offlineCookHistoryStore';

export interface WeeklyCookedItem {
  recipe_name: string;
  times: number;
  last_cooked_at: string;
}

export interface WeeklyCookedSummary {
  total_cooks: number;
  unique_recipes: number;
  items: WeeklyCookedItem[];
}

function startOfWeek(): Date {
  const now = new Date();
  const weekStart = new Date(now);
  const day = now.getDay();
  weekStart.setDate(now.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function summarize(namesAndDates: Array<{ recipe_name: string; cooked_at: string }>): WeeklyCookedSummary {
  const map = new Map<string, WeeklyCookedItem>();

  for (const row of namesAndDates) {
    const existing = map.get(row.recipe_name);
    if (!existing) {
      map.set(row.recipe_name, {
        recipe_name: row.recipe_name,
        times: 1,
        last_cooked_at: row.cooked_at,
      });
    } else {
      existing.times += 1;
      if (new Date(row.cooked_at).getTime() > new Date(existing.last_cooked_at).getTime()) {
        existing.last_cooked_at = row.cooked_at;
      }
    }
  }

  const items = Array.from(map.values()).sort(
    (a, b) => new Date(b.last_cooked_at).getTime() - new Date(a.last_cooked_at).getTime()
  );

  return {
    total_cooks: namesAndDates.length,
    unique_recipes: items.length,
    items,
  };
}

async function fetchWeeklyCooked(): Promise<WeeklyCookedSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { total_cooks: 0, unique_recipes: 0, items: [] };
  }

  const weekStartIso = startOfWeek().toISOString();

  const { data, error } = await supabase
    .from('cooking_history')
    .select('cooked_at, recipes(name)')
    .eq('user_id', user.id)
    .gte('cooked_at', weekStartIso)
    .order('cooked_at', { ascending: false });

  if (error) {
    const fallback = readCookHistoryFallback(user.id)
      .filter((row) => new Date(row.cooked_at).getTime() >= new Date(weekStartIso).getTime())
      .map((row) => ({ recipe_name: row.recipe_name, cooked_at: row.cooked_at }));
    return summarize(fallback);
  }

  const rows = (data ?? []).map((row: any) => ({
    recipe_name: row.recipes?.name ?? 'Unknown Recipe',
    cooked_at: row.cooked_at,
  }));

  return summarize(rows);
}

export function useWeeklyCooked() {
  return useQuery({
    queryKey: ['weekly-cooked'],
    queryFn: fetchWeeklyCooked,
    staleTime: 30_000,
    retry: false,
  });
}
