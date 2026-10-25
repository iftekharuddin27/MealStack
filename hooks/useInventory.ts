'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toBase } from '@/lib/unitNormalizer';
import { readInventoryFallback, writeInventoryFallback } from '@/lib/offlineInventoryStore';
import { DEMO_FALLBACK_ENABLED } from '@/lib/demoMode';
import type {
  AddInventoryRequest,
  InventoryEventType,
  InventoryItemFlat,
  UpdateInventoryRequest,
  Unit,
  Category,
} from '@/types';

const QUERY_KEY = ['inventory'] as const;

async function currentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function mapServerInventory(data: any[]): InventoryItemFlat[] {
  return data.map((row: any) => {
    const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;
    return {
      id: row.id,
      name: ingredient?.name ?? 'Unknown ingredient',
      qty: Number(row.quantity),
      unit: row.unit as Unit,
      quantity_base: Number(row.quantity_base),
      category: ingredient?.category as Category,
      expires_at: row.expires_at,
      price_per_unit: Number(ingredient?.price_per_unit ?? 0),
      purchased_at: row.purchased_at ?? row.added_at,
      storage_location: row.storage_location ?? 'fridge',
      purchase_price: row.purchase_price == null ? null : Number(row.purchase_price),
      initial_quantity_base: Number(row.initial_quantity_base ?? row.quantity_base),
    };
  });
}

async function responseError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => null);
  return new Error(body?.error ?? fallback);
}

async function fetchInventory(): Promise<InventoryItemFlat[]> {
  const res = await fetch('/api/inventory');

  if (!res.ok) {
    if (DEMO_FALLBACK_ENABLED && res.status >= 500) {
      const userId = await currentUserId();
      if (userId) return readInventoryFallback(userId);
    }
    throw await responseError(res, 'Failed to load inventory.');
  }

  const { data } = await res.json();
  const mapped = mapServerInventory(data ?? []);
  if (DEMO_FALLBACK_ENABLED) {
    const userId = await currentUserId();
    if (userId) writeInventoryFallback(userId, mapped);
  }
  return mapped;
}

export function useInventory() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchInventory,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddInventoryRequest) => {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        if (DEMO_FALLBACK_ENABLED && res.status >= 500) {
          const userId = await currentUserId();
          if (!userId) throw new Error('Session expired. Please sign in again.');
          const current = readInventoryFallback(userId);
          const quantityBase = toBase(input.quantity, input.unit);
          writeInventoryFallback(userId, [
            ...current,
            {
              id: `demo-${crypto.randomUUID()}`,
              name: input.ingredient_name,
              qty: input.quantity,
              unit: input.unit,
              quantity_base: quantityBase,
              category: input.category,
              expires_at: input.expires_at,
              price_per_unit: 0,
              purchased_at: input.purchased_at ?? new Date().toISOString(),
              storage_location: input.storage_location,
              purchase_price: input.purchase_price ?? null,
              initial_quantity_base: quantityBase,
            },
          ]);
          return { demoFallback: true };
        }
        throw await responseError(res, 'Failed to add inventory lot.');
      }
      return res.json();
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<InventoryItemFlat[]>(QUERY_KEY);
      const quantityBase = toBase(input.quantity, input.unit);
      queryClient.setQueryData<InventoryItemFlat[]>(QUERY_KEY, (old = []) => [
        ...old,
        {
          id: `optimistic-${crypto.randomUUID()}`,
          name: input.ingredient_name,
          qty: input.quantity,
          unit: input.unit,
          quantity_base: quantityBase,
          category: input.category,
          expires_at: input.expires_at,
          price_per_unit: 0,
          purchased_at: input.purchased_at ?? new Date().toISOString(),
          storage_location: input.storage_location,
          purchase_price: input.purchase_price ?? null,
          initial_quantity_base: quantityBase,
        },
      ]);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateInventoryRequest) => {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw await responseError(res, 'Failed to update inventory lot.');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useRecordInventoryEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inventoryId,
      eventType,
      quantityBase,
    }: {
      inventoryId: string;
      eventType: InventoryEventType;
      quantityBase?: number;
    }) => {
      const res = await fetch('/api/inventory/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: inventoryId,
          event_type: eventType,
          quantity_base: quantityBase,
        }),
      });
      if (!res.ok) throw await responseError(res, 'Failed to record inventory outcome.');
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      ]);
    },
  });
}

export function useRemoveInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/inventory?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw await responseError(res, 'Failed to remove inventory lot.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
