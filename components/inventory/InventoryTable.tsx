'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useInventory,
  useRecordInventoryEvent,
  useRemoveInventoryItem,
  useUpdateInventoryItem,
} from '@/hooks/useInventory';
import ExpiryBadge from './ExpiryBadge';
import type { InventoryEventType, InventoryItemFlat, StorageLocation } from '@/types';

const EVENT_LABELS: Record<InventoryEventType, string> = {
  consumed: 'Used manually', discarded: 'Discarded', donated: 'Donated', expired: 'Expired',
};

function dateInputValue(value: string): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function InventoryTable() {
  const { data: inventory = [], isLoading, error } = useInventory();
  const removeItem = useRemoveInventoryItem();
  const recordEvent = useRecordInventoryEvent();
  const [editing, setEditing] = useState<InventoryItemFlat | null>(null);
  const [message, setMessage] = useState('');

  async function record(item: InventoryItemFlat, eventType: InventoryEventType) {
    const confirmed = window.confirm(
      `Mark the full ${item.qty}${item.unit} lot of ${item.name} as “${EVENT_LABELS[eventType]}”?`
    );
    if (!confirmed) return;
    try {
      await recordEvent.mutateAsync({ inventoryId: item.id, eventType });
      setMessage(`${item.name} recorded as ${EVENT_LABELS[eventType].toLowerCase()}.`);
    } catch (eventError) {
      setMessage(eventError instanceof Error ? eventError.message : 'Could not record outcome.');
    }
  }

  async function removeIncorrect(item: InventoryItemFlat) {
    if (!window.confirm(`Delete ${item.name} without recording an outcome? Use this only for an incorrect entry.`)) return;
    try {
      await removeItem.mutateAsync(item.id);
      setMessage('Incorrect inventory entry removed.');
    } catch (removeError) {
      setMessage(removeError instanceof Error ? removeError.message : 'Could not remove entry.');
    }
  }

  if (isLoading) return <div className="py-8 text-center font-mono text-xs text-muted-foreground">Loading inventory…</div>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Inventory lots · FIFO by expiry</span>
        <span className="font-mono text-[11px] text-green-400">{inventory.length} lots</span>
        <div className="h-px min-w-12 flex-1 bg-border" />
      </div>
      {(error || message) && (
        <p role="status" className={`mb-3 rounded-lg border px-3 py-2 text-sm ${error || recordEvent.isError || removeItem.isError ? 'border-red-900 bg-red-950/40 text-red-300' : 'border-border bg-background-3 text-muted-foreground'}`}>
          {error?.message ?? message}
        </p>
      )}

      {inventory.length === 0 ? (
        <div className="card px-4 py-8 text-center text-sm text-muted-foreground">Your inventory is empty. Add a purchase lot above.</div>
      ) : (
        <div className="grid gap-3">
          {inventory.map((item) => (
            <article key={item.id} className="card p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{item.name}</h3>
                    <span className="rounded border border-border bg-background-3 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{item.category}</span>
                    <span className="rounded border border-border bg-background-3 px-2 py-0.5 font-mono text-[10px] capitalize text-muted-foreground">{item.storage_location}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <strong className="font-mono text-sm text-foreground">{item.qty}{item.unit}</strong>
                    <span>Purchased {new Date(item.purchased_at).toLocaleDateString()}</span>
                    <ExpiryBadge expiresAt={item.expires_at} />
                    {item.purchase_price != null && <span>Paid ৳{item.purchase_price.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditing(item)} className="rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-accent hover:text-foreground">Edit</button>
                  <button onClick={() => record(item, 'consumed')} disabled={recordEvent.isPending} className="rounded border border-green-900 px-2.5 py-1.5 text-xs text-green-400 hover:bg-green-950/40">Used</button>
                  <button onClick={() => record(item, 'donated')} disabled={recordEvent.isPending} className="rounded border border-teal-900 px-2.5 py-1.5 text-xs text-teal-400 hover:bg-teal-950/40">Donate</button>
                  <button onClick={() => record(item, new Date(item.expires_at) <= new Date() ? 'expired' : 'discarded')} disabled={recordEvent.isPending} className="rounded border border-red-900 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40">
                    {new Date(item.expires_at) <= new Date() ? 'Expired' : 'Discard'}
                  </button>
                  <button onClick={() => removeIncorrect(item)} disabled={removeItem.isPending} aria-label={`Delete incorrect ${item.name} entry`} className="rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-red-300">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <EditLotDialog item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditLotDialog({ item, onClose }: { item: InventoryItemFlat; onClose: () => void }) {
  const updateItem = useUpdateInventoryItem();
  const [quantity, setQuantity] = useState(String(item.qty));
  const [expiresAt, setExpiresAt] = useState(dateInputValue(item.expires_at));
  const [location, setLocation] = useState<StorageLocation>(item.storage_location);
  const [purchasePrice, setPurchasePrice] = useState(item.purchase_price == null ? '' : String(item.purchase_price));
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await updateItem.mutateAsync({
      id: item.id,
      quantity: Number(quantity),
      unit: item.unit,
      expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
      storage_location: location,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-lot-title" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 id="edit-lot-title" className="font-head text-xl">Edit {item.name} lot</h2>
        <form onSubmit={save} className="mt-4 space-y-3">
          <label className="block text-xs text-muted-foreground">Quantity ({item.unit})
            <input ref={firstField} type="number" min="0.001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background-3 px-3 py-2 text-foreground" />
          </label>
          <label className="block text-xs text-muted-foreground">Expiry date
            <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background-3 px-3 py-2 text-foreground" />
          </label>
          <label className="block text-xs text-muted-foreground">Storage
            <select value={location} onChange={(event) => setLocation(event.target.value as StorageLocation)} className="mt-1 w-full rounded-lg border border-border bg-background-3 px-3 py-2 text-foreground">
              {['fridge', 'freezer', 'pantry', 'counter'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">Purchase price · BDT
            <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background-3 px-3 py-2 text-foreground" />
          </label>
          {updateItem.error && <p role="alert" className="text-sm text-red-400">{updateItem.error.message}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground">Cancel</button>
            <button type="submit" disabled={updateItem.isPending} className="flex-1 rounded-lg bg-accent py-2 text-sm font-bold text-background disabled:opacity-60">{updateItem.isPending ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
