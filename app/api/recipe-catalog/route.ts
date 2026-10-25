import { NextRequest, NextResponse } from 'next/server';
import {
  mealDbIngredientToSuggestion,
  mealDbToRecipe,
  type MealDbIngredient,
  type MealDbMeal,
} from '@/lib/recipeCatalog';

const API_KEY = /^[A-Za-z0-9_-]+$/.test(process.env.THEMEALDB_API_KEY ?? '')
  ? process.env.THEMEALDB_API_KEY!
  : '1';
const API_BASE = `https://www.themealdb.com/api/json/v1/${API_KEY}`;

async function mealDb<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Recipe provider returned ${response.status}.`);
  return response.json() as Promise<T>;
}

async function detailsFor(meals: MealDbMeal[], limit: number): Promise<MealDbMeal[]> {
  const selected = meals.slice(0, limit);
  const detailed = await Promise.all(selected.map(async (meal) => {
    if (meal.strInstructions) return meal;
    const response = await mealDb<{ meals: MealDbMeal[] | null }>(
      `lookup.php?i=${encodeURIComponent(meal.idMeal)}`
    );
    return response.meals?.[0] ?? null;
  }));
  return detailed.filter((meal): meal is MealDbMeal => Boolean(meal));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('mode');

  try {
    if (mode === 'ingredients') {
      const response = await mealDb<{ meals: MealDbIngredient[] | null }>('list.php?i=list');
      const ingredients = (response.meals ?? [])
        .filter((item) => item.strIngredient?.trim())
        .map(mealDbIngredientToSuggestion)
        .sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json(
        { data: ingredients, source: 'TheMealDB' },
        { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } }
      );
    }

    const query = params.get('q')?.trim().slice(0, 60) ?? '';
    const category = params.get('category')?.trim().slice(0, 40) || 'Breakfast';
    const limit = Math.min(16, Math.max(1, Number(params.get('limit')) || 10));
    let meals: MealDbMeal[] = [];

    if (query) {
      const [nameResponse, ingredientResponse] = await Promise.all([
        mealDb<{ meals: MealDbMeal[] | null }>(`search.php?s=${encodeURIComponent(query)}`),
        mealDb<{ meals: MealDbMeal[] | null }>(`filter.php?i=${encodeURIComponent(query.replace(/\s+/g, '_'))}`)
          .catch(() => ({ meals: null })),
      ]);
      const combined = [...(nameResponse.meals ?? []), ...(ingredientResponse.meals ?? [])];
      meals = Array.from(new Map(combined.map((meal) => [meal.idMeal, meal])).values());
    } else {
      const response = await mealDb<{ meals: MealDbMeal[] | null }>(
        `filter.php?c=${encodeURIComponent(category)}`
      );
      meals = response.meals ?? [];
    }

    const detailed = await detailsFor(meals, limit);
    return NextResponse.json(
      { data: detailed.map(mealDbToRecipe), source: 'TheMealDB' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recipe provider is unavailable.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
