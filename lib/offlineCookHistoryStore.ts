// ============================================================
// MealStack · Offline Cook History Store
// Persists cooked recipe events when analytics tables are missing.
// ============================================================

export interface OfflineCookEntry {
  id: string;
  recipe_id: string;
  recipe_name: string;
  cooked_at: string;
}

const STORAGE_KEY = 'mealstack_cooked_by_user';

function safeUserKey(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function cookieName(userId: string): string {
  return `mealstack_cooked_${safeUserKey(userId)}`;
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

function readMap(): Record<string, OfflineCookEntry[]> {
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

function writeMap(map: Record<string, OfflineCookEntry[]>) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota/private mode errors
  }
}

export function readCookHistoryFallback(userId: string): OfflineCookEntry[] {
  const map = readMap();
  const fromLocal = map[userId];

  if (Array.isArray(fromLocal)) {
    return fromLocal;
  }

  try {
    const rawCookie = getCookie(cookieName(userId));
    if (!rawCookie) return [];
    const parsed = JSON.parse(decodeURIComponent(rawCookie));
    const fromCookie = Array.isArray(parsed) ? parsed : [];
    map[userId] = fromCookie;
    writeMap(map);
    return fromCookie;
  } catch {
    return [];
  }
}

export function appendCookHistoryFallback(userId: string, entry: OfflineCookEntry) {
  const current = readCookHistoryFallback(userId);
  const next = [entry, ...current].slice(0, 200);

  const map = readMap();
  map[userId] = next;
  writeMap(map);

  try {
    const encoded = encodeURIComponent(JSON.stringify(next));
    setCookie(cookieName(userId), encoded, 60 * 60 * 24 * 30);
  } catch {
    // ignore serialization issues
  }
}
