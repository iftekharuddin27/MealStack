import { getBaseUnit } from '@/lib/unitNormalizer';
import type {
  AddInventoryRequest,
  Category,
  InventoryEventType,
  StorageLocation,
  Unit,
  UpdateInventoryRequest,
} from '@/types';

const UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup'];
const CATEGORIES: Category[] = ['grain', 'dairy', 'protein', 'veg', 'spice'];
const LOCATIONS: StorageLocation[] = ['fridge', 'freezer', 'pantry', 'counter'];
const EVENT_TYPES: InventoryEventType[] = ['consumed', 'discarded', 'donated', 'expired'];

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object.');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > max) throw new ValidationError(`${field} is too long.`);
  return normalized;
}

function positiveNumber(value: unknown, field: string, max = 1_000_000): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) {
    throw new ValidationError(`${field} must be a positive number no greater than ${max}.`);
  }
  return value;
}

function optionalNonNegativeNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100_000_000) {
    throw new ValidationError(`${field} must be a non-negative number.`);
  }
  return value;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new ValidationError(`${field} is invalid.`);
  }
  return value as T;
}

function isoDate(value: unknown, field: string): string {
  const raw = text(value, field, 80);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${field} must be a valid date.`);
  return date.toISOString();
}

function uuid(value: unknown, field: string): string {
  const raw = text(value, field, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    throw new ValidationError(`${field} must be a valid UUID.`);
  }
  return raw;
}

export function parseAddInventory(value: unknown): AddInventoryRequest {
  const body = objectBody(value);
  return {
    ingredient_name: text(body.ingredient_name, 'ingredient_name'),
    quantity: positiveNumber(body.quantity, 'quantity'),
    unit: enumValue(body.unit, UNITS, 'unit'),
    category: enumValue(body.category, CATEGORIES, 'category'),
    expires_at: isoDate(body.expires_at, 'expires_at'),
    purchased_at: body.purchased_at ? isoDate(body.purchased_at, 'purchased_at') : undefined,
    storage_location: enumValue(body.storage_location, LOCATIONS, 'storage_location'),
    purchase_price: optionalNonNegativeNumber(body.purchase_price, 'purchase_price'),
  };
}

export function parseUpdateInventory(value: unknown): UpdateInventoryRequest {
  const body = objectBody(value);
  return {
    id: uuid(body.id, 'id'),
    quantity: positiveNumber(body.quantity, 'quantity'),
    unit: enumValue(body.unit, UNITS, 'unit'),
    expires_at: isoDate(body.expires_at, 'expires_at'),
    storage_location: enumValue(body.storage_location, LOCATIONS, 'storage_location'),
    purchase_price: optionalNonNegativeNumber(body.purchase_price, 'purchase_price'),
  };
}

export function parseCookRequest(value: unknown): { recipe_id: string; servings?: number } {
  const body = objectBody(value);
  const servings = body.servings === undefined
    ? undefined
    : positiveNumber(body.servings, 'servings', 100);
  if (servings !== undefined && !Number.isInteger(servings)) {
    throw new ValidationError('servings must be a whole number.');
  }
  return { recipe_id: uuid(body.recipe_id, 'recipe_id'), servings };
}

export function parseInventoryEvent(value: unknown): {
  inventory_id: string;
  event_type: InventoryEventType;
  quantity_base?: number;
} {
  const body = objectBody(value);
  return {
    inventory_id: uuid(body.inventory_id, 'inventory_id'),
    event_type: enumValue(body.event_type, EVENT_TYPES, 'event_type'),
    quantity_base: body.quantity_base === undefined
      ? undefined
      : positiveNumber(body.quantity_base, 'quantity_base'),
  };
}

export function parseShoppingItem(value: unknown): {
  ingredient_id?: string;
  ingredient_name: string;
  quantity_base: number;
  unit: 'g' | 'ml' | 'pcs';
} {
  const body = objectBody(value);
  const unit = enumValue(body.unit, ['g', 'ml', 'pcs'] as const, 'unit');
  return {
    ingredient_id: typeof body.ingredient_id === 'string' && body.ingredient_id
      ? uuid(body.ingredient_id, 'ingredient_id')
      : undefined,
    ingredient_name: text(body.ingredient_name, 'ingredient_name'),
    quantity_base: positiveNumber(body.quantity_base, 'quantity_base'),
    unit: getBaseUnit(unit),
  };
}

export function validationMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid request.';
}
