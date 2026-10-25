import { ingredientNamesMatch } from './ingredientAliases.ts';
import type { ShoppingListItem } from '@/types';

const STORAGE_KEY = 'mealstack_shopping_list_by_user';

function readAll(): Record<string, ShoppingListItem[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeAll(value: Record<string, ShoppingListItem[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function readLocalShoppingList(userId: string): ShoppingListItem[] {
  return readAll()[userId] ?? [];
}

export function addLocalShoppingItem(
  userId: string,
  input: Omit<ShoppingListItem, 'id' | 'checked' | 'created_at'>
) {
  const all = readAll();
  const current = all[userId] ?? [];
  const existing = current.find((item) =>
    !item.checked && item.unit === input.unit
    && ingredientNamesMatch(item.ingredient_name, input.ingredient_name)
  );

  all[userId] = existing
    ? current.map((item) => item.id === existing.id
      ? { ...item, quantity_base: item.quantity_base + input.quantity_base }
      : item)
    : [{
        ...input,
        id: `local-shopping-${crypto.randomUUID()}`,
        checked: false,
        created_at: new Date().toISOString(),
      }, ...current];
  writeAll(all);
}

export function toggleLocalShoppingItem(userId: string, id: string, checked: boolean) {
  const all = readAll();
  all[userId] = (all[userId] ?? []).map((item) => item.id === id ? { ...item, checked } : item);
  writeAll(all);
}

export function deleteLocalShoppingItem(userId: string, id: string) {
  const all = readAll();
  all[userId] = (all[userId] ?? []).filter((item) => item.id !== id);
  writeAll(all);
}
