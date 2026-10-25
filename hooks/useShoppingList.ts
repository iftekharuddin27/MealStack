'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  addLocalShoppingItem,
  deleteLocalShoppingItem,
  readLocalShoppingList,
  toggleLocalShoppingItem,
} from '@/lib/localShoppingListStore';
import type { ShoppingListItem } from '@/types';

const KEY = ['shopping-list'] as const;

async function responseBody(res: Response) {
  return res.json().catch(() => null);
}

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Session expired. Please sign in again.');
  return user.id;
}

function setupRequired(res: Response, body: any): boolean {
  return res.status === 503 && body?.code === 'setup_required';
}

export function useShoppingList() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ShoppingListItem[]> => {
      const res = await fetch('/api/shopping-list');
      const body = await responseBody(res);
      if (setupRequired(res, body)) return readLocalShoppingList(await currentUserId());
      if (!res.ok) throw new Error(body?.error ?? 'Shopping list request failed.');
      const { data } = body;
      return (data ?? []).map((item: any) => ({
        ...item,
        quantity_base: Number(item.quantity_base),
      }));
    },
  });
}

export function useAddShoppingItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{
      ingredient_id?: string;
      ingredient_name: string;
      quantity_base: number;
      unit: 'g' | 'ml' | 'pcs';
    }>) => {
      for (const item of items) {
        const res = await fetch('/api/shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        const body = await responseBody(res);
        if (setupRequired(res, body)) {
          addLocalShoppingItem(await currentUserId(), {
            ingredient_id: item.ingredient_id ?? null,
            ingredient_name: item.ingredient_name,
            quantity_base: item.quantity_base,
            unit: item.unit,
          });
          continue;
        }
        if (!res.ok) throw new Error(body?.error ?? 'Shopping list request failed.');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const res = await fetch('/api/shopping-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, checked }),
      });
      const body = await responseBody(res);
      if (setupRequired(res, body)) {
        toggleLocalShoppingItem(await currentUserId(), id, checked);
        return;
      }
      if (!res.ok) throw new Error(body?.error ?? 'Shopping list request failed.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shopping-list?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const body = await responseBody(res);
      if (setupRequired(res, body)) {
        deleteLocalShoppingItem(await currentUserId(), id);
        return;
      }
      if (!res.ok) throw new Error(body?.error ?? 'Shopping list request failed.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
