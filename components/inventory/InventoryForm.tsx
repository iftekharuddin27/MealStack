'use client';

import { useMemo, useState } from 'react';
import { useAddInventoryItem } from '@/hooks/useInventory';
import { useIngredientCatalog } from '@/hooks/useRecipeCatalog';
import { EXPIRY_DAYS } from '@/lib/expiryLogic';
import { getCompatibleUnits, getConversionHint } from '@/lib/unitNormalizer';
import type { Category, IngredientSuggestion, StorageLocation, Unit } from '@/types';

const ALL_UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup'];
const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: 'grain', label: 'Grain' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'protein', label: 'Protein' },
  { value: 'veg', label: 'Vegetable' },
  { value: 'spice', label: 'Spice' },
];
const LOCATIONS: Array<{ value: StorageLocation; label: string }> = [
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'counter', label: 'Counter' },
];
const COMMON_INGREDIENTS: IngredientSuggestion[] = [
  { id: 'common-rice', name: 'Basmati Rice', category: 'grain', unit: 'g' },
  { id: 'common-milk', name: 'Whole Milk', category: 'dairy', unit: 'ml' },
  { id: 'common-tea', name: 'Tea Leaf', category: 'spice', unit: 'g' },
  { id: 'common-sugar', name: 'Sugar', category: 'spice', unit: 'g' },
  { id: 'common-eggs', name: 'Eggs', category: 'protein', unit: 'pcs' },
  { id: 'common-oil', name: 'Olive oil', category: 'spice', unit: 'ml' },
  { id: 'common-salt', name: 'Salt', category: 'spice', unit: 'g' },
  { id: 'common-garlic', name: 'Garlic', category: 'veg', unit: 'pcs' },
  { id: 'common-butter', name: 'Butter', category: 'dairy', unit: 'g' },
  { id: 'common-spaghetti', name: 'Spaghetti', category: 'grain', unit: 'g' },
  { id: 'common-chicken', name: 'Chicken Breast', category: 'protein', unit: 'g' },
  { id: 'common-spinach', name: 'Spinach', category: 'veg', unit: 'g' },
];

function dateInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function defaultExpiry(category: Category): string {
  const date = new Date();
  date.setDate(date.getDate() + EXPIRY_DAYS[category]);
  return dateInputValue(date);
}

export default function InventoryForm() {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('g');
  const [category, setCategory] = useState<Category>('grain');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry('grain'));
  const [purchasedAt, setPurchasedAt] = useState(dateInputValue(new Date()));
  const [location, setLocation] = useState<StorageLocation>('pantry');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [message, setMessage] = useState('');
  const addItem = useAddInventoryItem();
  const { data: catalogIngredients = [], isLoading: catalogLoading } = useIngredientCatalog();

  const ingredientOptions = useMemo(() => {
    const merged = new Map<string, IngredientSuggestion>();
    for (const item of [...COMMON_INGREDIENTS, ...catalogIngredients]) {
      const key = item.name.toLowerCase();
      if (!merged.has(key)) merged.set(key, item);
    }
    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogIngredients]);

  const knownIngredient = useMemo(() => ingredientOptions.find((item) =>
    item.name.toLowerCase() === name.trim().toLowerCase()
  ), [ingredientOptions, name]);
  const allowedUnits = knownIngredient ? getCompatibleUnits(knownIngredient.unit) : ALL_UNITS;
  const inputClass = 'w-full rounded-lg border border-border bg-background-3 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

  function chooseIngredient(item: IngredientSuggestion) {
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setExpiresAt(defaultExpiry(item.category));
    setLocation(item.category === 'grain' || item.category === 'spice' ? 'pantry' : 'fridge');
  }

  function changeIngredientName(value: string) {
    setName(value);
    const exact = ingredientOptions.find((item) =>
      item.name.toLowerCase() === value.trim().toLowerCase()
    );
    if (exact) chooseIngredient(exact);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      await addItem.mutateAsync({
        ingredient_name: name.trim(),
        quantity: Number(quantity),
        unit,
        category,
        expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
        purchased_at: new Date(`${purchasedAt}T12:00:00`).toISOString(),
        storage_location: location,
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
      });
      setMessage(`Added a new ${name.trim()} lot.`);
      setName('');
      setQuantity('');
      setPurchasePrice('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add inventory lot.');
    }
  }

  return (
    <div className="card space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Add inventory lot</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Common ingredients">
          {COMMON_INGREDIENTS.slice(0, 8).map((item) => (
            <button key={item.name} type="button" onClick={() => chooseIngredient(item)} className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground transition hover:border-accent/60 hover:text-foreground">
              {item.name}
            </button>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field id="ingredient-name" label="Ingredient">
            <input id="ingredient-name" value={name} onChange={(event) => changeIngredientName(event.target.value)} list="ingredient-suggestions" required className={inputClass} placeholder="Search 900+ ingredients" autoComplete="off" />
            <datalist id="ingredient-suggestions">
              {ingredientOptions.map((item) => <option key={item.id} value={item.name} />)}
            </datalist>
          </Field>
          <Field id="inventory-quantity" label="Quantity">
            <input id="inventory-quantity" type="number" min="0.001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className={inputClass} />
          </Field>
          <Field id="inventory-unit" label="Unit">
            <select id="inventory-unit" value={unit} onChange={(event) => setUnit(event.target.value as Unit)} className={inputClass}>
              {allowedUnits.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field id="inventory-category" label="Category">
            <select id="inventory-category" value={category} onChange={(event) => {
              const next = event.target.value as Category;
              setCategory(next);
              setExpiresAt(defaultExpiry(next));
            }} className={inputClass}>
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field id="purchased-at" label="Purchased">
            <input id="purchased-at" type="date" value={purchasedAt} max={dateInputValue(new Date())} onChange={(event) => setPurchasedAt(event.target.value)} required className={inputClass} />
          </Field>
          <Field id="expires-at" label="Expires">
            <input id="expires-at" type="date" value={expiresAt} min={purchasedAt} onChange={(event) => setExpiresAt(event.target.value)} required className={inputClass} />
          </Field>
          <Field id="storage-location" label="Storage">
            <select id="storage-location" value={location} onChange={(event) => setLocation(event.target.value as StorageLocation)} className={inputClass}>
              {LOCATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field id="purchase-price" label="Price paid · BDT (optional)">
            <input id="purchase-price" type="number" min="0" step="0.01" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={addItem.isPending} className="rounded-lg bg-accent px-5 py-2 text-[12px] font-bold text-background transition hover:bg-accent-hover disabled:opacity-60">
            {addItem.isPending ? 'Adding…' : '+ Add lot'}
          </button>
          <span className="font-mono text-[11px] text-muted-foreground">
            {getConversionHint(unit)} · Default shelf life: {EXPIRY_DAYS[category]} days
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {catalogLoading ? 'Syncing recipe ingredients…' : `${catalogIngredients.length.toLocaleString()} recipe ingredients available`}
          </span>
          {message && <span role="status" className={`text-xs ${addItem.isError ? 'text-red-400' : 'text-green-400'}`}>{message}</span>}
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
