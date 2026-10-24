'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShoppingListItem } from '@/types';

const KEY = ['shopping-list'] as const;

async function errorFrom(res: Response) {
  const body = await res.json().catch(() => null);
  return new Error(body?.error ?? 'Shopping list request failed.');
}

export function useShoppingList() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ShoppingListItem[]> => {
      const res = await fetch('/api/shopping-list');
      if (!res.ok) throw await errorFrom(res);
      const { data } = await res.json();
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
        if (!res.ok) throw await errorFrom(res);
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
      if (!res.ok) throw await errorFrom(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shopping-list?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw await errorFrom(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
