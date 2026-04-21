// ============================================================
// MealStack · Smart Expiry Logic
// Assigns expiry dates by category and computes expiry status.
// ============================================================

import type { Category, ExpiryInfo, ExpiryStatus } from '@/types';

/**
 * Default shelf-life in days by ingredient category.
 * These are conservative estimates — real expiry varies by brand/storage.
 */
export const EXPIRY_DAYS: Record<Category, number> = {
  dairy:   7,    // milk, cheese, butter, yoghurt
  protein: 5,    // raw meat, fish (cooked = 3-4 days)
  veg:     3,    // leafy greens, fresh produce
  grain:   180,  // rice, pasta, flour, oats
  spice:   365,  // dried spices (whole or ground)
};

/**
 * Compute an expiry date from today for a given category.
 * Called on the client when the user adds an item — the DB
 * stores the resulting timestamp in user_inventory.expires_at.
 */
export function assignExpiry(category: Category): Date {
  const days = EXPIRY_DAYS[category];
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 0); // expires end-of-day
  return d;
}

/**
 * Determine how many hours until an item expires.
 * Negative = already expired.
 */
export function hoursUntilExpiry(expiresAt: string | Date): number {
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return (exp.getTime() - Date.now()) / (1000 * 60 * 60);
}

/**
 * Classify an item's expiry status for color-coding.
 *
 *   expired  → already past expiry date
 *   critical → < 24 hours remaining  (RED)
 *   warning  → < 48 hours remaining  (AMBER/YELLOW)
 *   ok       → ≥ 48 hours remaining  (GREEN)
 */
export function getExpiryStatus(expiresAt: string | Date): ExpiryStatus {
  const hours = hoursUntilExpiry(expiresAt);
  if (hours < 0)  return 'expired';
  if (hours < 24) return 'critical';
  if (hours < 48) return 'warning';
  return 'ok';
}

/**
 * Full expiry info object — status, hours remaining, and a
 * human-readable label for display in the UI.
 */
export function getExpiryInfo(expiresAt: string | Date): ExpiryInfo {
  const hours = hoursUntilExpiry(expiresAt);
  const status = getExpiryStatus(expiresAt);

  let label: string;
  if (hours < 0) {
    label = 'Expired';
  } else if (hours < 1) {
    label = 'Expiring now';
  } else if (hours < 24) {
    label = `${Math.ceil(hours)}h left`;
  } else {
    const days = Math.round(hours / 24);
    label = `${days}d left`;
  }

  return { status, hours_remaining: hours, label };
}

/**
 * Tailwind / CSS class name helpers for expiry status.
 * Used by ExpiryBadge and dashboard list.
 */
export const EXPIRY_COLORS: Record<ExpiryStatus, {
  dot: string;
  badge: string;
  text: string;
}> = {
  expired:  { dot: 'bg-red-500',    badge: 'bg-red-950 text-red-400 border-red-800',    text: 'text-red-400' },
  critical: { dot: 'bg-red-500 ring-2 ring-red-500/30',  badge: 'bg-red-950 text-red-400 border-red-800',    text: 'text-red-400' },
  warning:  { dot: 'bg-amber-400',  badge: 'bg-amber-950 text-amber-400 border-amber-800', text: 'text-amber-400' },
  ok:       { dot: 'bg-green-500',  badge: 'bg-green-950 text-green-400 border-green-800', text: 'text-green-400' },
};
