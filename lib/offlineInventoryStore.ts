// ============================================================
// MealStack · Offline Inventory Store
// Persists fallback inventory by user across localhost ports.
// ============================================================

import type { InventoryItemFlat } from '@/types';

const STORAGE_KEY = 'mealstack_inventory_by_user';

function safeUserKey(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function cookieName(userId: string): string {
  return `mealstack_inv_${safeUserKey(userId)}`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const full = `; ${document.cookie}`;
  const parts = full.split(`; ${name}=`);
  if (parts.length !== 2) return null;
  return parts.pop()?.split(';').shift() ?? null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function readLocalMap(): Record<string, InventoryItemFlat[]> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalMap(map: Record<string, InventoryItemFlat[]>) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage can fail in private mode/quota errors
  }
}

export function readInventoryFallback(userId: string): InventoryItemFlat[] {
  const map = readLocalMap();
  const fromLocal = map[userId];

  if (Array.isArray(fromLocal)) {
    return fromLocal;
  }

  // Fallback to cookie, which survives localhost port changes.
  try {
    const rawCookie = getCookie(cookieName(userId));
    if (!rawCookie) return [];
    const parsed = JSON.parse(decodeURIComponent(rawCookie));
    const fromCookie = Array.isArray(parsed) ? parsed : [];

    // Rehydrate localStorage from cookie for faster reads afterward.
    map[userId] = fromCookie;
    writeLocalMap(map);

    return fromCookie;
  } catch {
    return [];
  }
}

export function writeInventoryFallback(userId: string, items: InventoryItemFlat[]) {
  const map = readLocalMap();
  map[userId] = items;
  writeLocalMap(map);

  try {
    const encoded = encodeURIComponent(JSON.stringify(items));
    // 30 days
    setCookie(cookieName(userId), encoded, 60 * 60 * 24 * 30);
  } catch {
    // ignore serialization errors
  }
}
