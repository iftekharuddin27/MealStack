// ============================================================
// MealStack · useInventory Hook
// TanStack Query wrapper with optimistic updates.
// Adding an item feels instant — the UI updates before the
// Supabase write confirms (optimistic update pattern).
// ============================================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { assignExpiry } from '@/lib/expiryLogic';
import { toBase } from '@/lib/unitNormalizer';
import { readInventoryFallback, writeInventoryFallback } from '@/lib/offlineInventoryStore';
import { ingredientNamesMatch } from '@/lib/ingredientAliases';
import type {
  InventoryItemFlat,
  AddInventoryRequest,
  Category,
  Unit,
} from '@/types';

const QUERY_KEY = ['inventory'] as const;
const SYNC_PENDING_KEY = 'mealstack_inventory_sync_pending_by_user';

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function readSyncPendingMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(SYNC_PENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setSyncPending(userId: string, pending: boolean) {
  if (typeof window === 'undefined') return;

  const map = readSyncPendingMap();
  if (pending) {
    map[userId] = true;
  } else {
    delete map[userId];
  }

  try {
    localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(map));
  } catch {
    // ignore localStorage errors
  }
}

function getSyncPending(userId: string): boolean {
  const map = readSyncPendingMap();
  return Boolean(map[userId]);
}

function mapServerInventory(data: any[]): InventoryItemFlat[] {
  return data.map((row: any) => ({
    id: row.id,
    name: row.ingredients.name,
    qty: row.quantity,
    unit: row.unit as Unit,
    quantity_base: row.quantity_base,
    category: row.ingredients.category as Category,
    expires_at: row.expires_at,
    price_per_unit: row.ingredients.price_per_unit ?? 0,
  }));
}

function mergePreferFallback(
  serverItems: InventoryItemFlat[],
  fallbackItems: InventoryItemFlat[]
): InventoryItemFlat[] {
  const merged = [...serverItems];

  for (const fallbackItem of fallbackItems) {
    const idx = merged.findIndex((serverItem) =>
      ingredientNamesMatch(serverItem.name, fallbackItem.name)
    );

    if (idx >= 0) {
      merged[idx] = fallbackItem;
    } else {
      merged.push(fallbackItem);
    }
  }

  return merged;
}

async function syncFallbackToServer(items: InventoryItemFlat[]): Promise<boolean> {
  for (const item of items) {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredient_name: item.name,
        quantity: item.qty,
        unit: item.unit,
        category: item.category,
      }),
    });

    if (!res.ok) {
      return false;
    }
  }

  return true;
}

// ── Fetcher ──────────────────────────────────────────────────

async function fetchInventory(): Promise<InventoryItemFlat[]> {
  const userId = await getCurrentUserId();
  const res = await fetch('/api/inventory');

  if (!res.ok) {
    if (res.status === 401) return [];
    return userId ? readInventoryFallback(userId) : [];
  }

  const { data } = await res.json();
  if (!data) {
    return userId ? readInventoryFallback(userId) : [];
  }

  const mapped = mapServerInventory(data);

  if (!userId) return mapped;

  const fallbackItems = readInventoryFallback(userId);
  const shouldSyncPending = getSyncPending(userId);

  if (fallbackItems.length > 0 && shouldSyncPending) {
    const synced = await syncFallbackToServer(fallbackItems);

    if (synced) {
      const refreshed = await fetch('/api/inventory');
      if (refreshed.ok) {
        const refreshedJson = await refreshed.json();
        const refreshedMapped = mapServerInventory(refreshedJson.data ?? []);
        writeInventoryFallback(userId, refreshedMapped);
        setSyncPending(userId, false);
        return refreshedMapped;
      }
      setSyncPending(userId, false);
    } else {
      const merged = mergePreferFallback(mapped, fallbackItems);
      writeInventoryFallback(userId, merged);
      setSyncPending(userId, true);
      return merged;
    }
  }

  writeInventoryFallback(userId, mapped);

  return mapped;
}

// ── useInventory ─────────────────────────────────────────────

export function useInventory() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchInventory,
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// ── useAddInventoryItem ───────────────────────────────────────

export function useAddInventoryItem(): UseMutationResult<
  void,
  Error,
  AddInventoryRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: AddInventoryRequest) => {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (res.ok) {
        return;
      }

      const payload = await res.json().catch(() => null);
      const message = payload?.error ?? 'Failed to add item';

      if (res.status === 401) {
        throw new Error('Session expired. Please sign in again.');
      }

      // Database not ready (e.g. missing migrated tables): keep app usable with local fallback.
      if (res.status >= 500) {
        const userId = await getCurrentUserId();
        if (!userId) {
          throw new Error('Please sign in again.');
        }

        const current = readInventoryFallback(userId);
        const existingIndex = current.findIndex((item) =>
          ingredientNamesMatch(item.name, req.ingredient_name)
        );

        const next = [...current];

        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            qty: req.quantity,
            unit: req.unit,
            quantity_base: toBase(req.quantity, req.unit),
            category: req.category,
            expires_at: assignExpiry(req.category).toISOString(),
          };
        } else {
          next.push({
            id: `local-${Date.now()}`,
            name: req.ingredient_name,
            qty: req.quantity,
            unit: req.unit,
            quantity_base: toBase(req.quantity, req.unit),
            category: req.category,
            expires_at: assignExpiry(req.category).toISOString(),
            price_per_unit: 0,
          });
        }

        writeInventoryFallback(userId, next);
        setSyncPending(userId, true);
        return;
      }

      throw new Error(message);
    },

    // ── Optimistic update ─────────────────────────────────────
    // Immediately add the item to the cached list so the UI
    // responds before the server round-trip completes.
    onMutate: async (req) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<InventoryItemFlat[]>(QUERY_KEY);

      queryClient.setQueryData<InventoryItemFlat[]>(QUERY_KEY, (old = []) => [
        ...old,
        {
          id: `optimistic-${Date.now()}`,
          name: req.ingredient_name,
          qty: req.quantity,
          unit: req.unit,
          quantity_base: toBase(req.quantity, req.unit),
          category: req.category,
          expires_at: assignExpiry(req.category).toISOString(),
          price_per_unit: 0,
        },
      ]);

      return { previous };
    },

    onError: (_err, _req, ctx: any) => {
      // Roll back on error
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },

    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// ── useRemoveInventoryItem ────────────────────────────────────

export function useRemoveInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/inventory?id=${itemId}`, { method: 'DELETE' });

      if (res.ok) {
        return;
      }

      if (res.status === 401) {
        throw new Error('Session expired. Please sign in again.');
      }

      if (res.status >= 500) {
        const userId = await getCurrentUserId();
        if (!userId) {
          throw new Error('Please sign in again.');
        }

        const current = readInventoryFallback(userId);
        writeInventoryFallback(userId, current.filter((i) => i.id !== itemId));
        setSyncPending(userId, true);
        return;
      }

      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error ?? 'Failed to delete item');
    },

    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<InventoryItemFlat[]>(QUERY_KEY);
      queryClient.setQueryData<InventoryItemFlat[]>(QUERY_KEY, (old = []) =>
        old.filter((i) => i.id !== itemId)
      );
      return { previous };
    },

    onError: (_err, _id, ctx: any) => {
      if (ctx?.previous) queryClient.setQueryData(QUERY_KEY, ctx.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
