'use client';

import { useDeleteShoppingItem, useShoppingList, useToggleShoppingItem } from '@/hooks/useShoppingList';

export default function ShoppingList() {
  const { data: items = [], isLoading, error } = useShoppingList();
  const toggle = useToggleShoppingItem();
  const remove = useDeleteShoppingItem();

  if (isLoading) return <p className="py-10 text-center font-mono text-xs text-muted-foreground">Loading shopping list…</p>;

  return (
    <div className="card overflow-hidden">
      {error && <p role="alert" className="m-4 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error.message}</p>}
      {items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Your shopping list is empty.</p>
          <p className="mt-1 text-xs text-muted-foreground">Add missing ingredients from any recipe card.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <input aria-label={`Mark ${item.ingredient_name} as ${item.checked ? 'not purchased' : 'purchased'}`} type="checkbox" checked={item.checked} onChange={() => toggle.mutate({ id: item.id, checked: !item.checked })} className="h-4 w-4 accent-lime-400" />
              <div className="min-w-0 flex-1">
                <div className={item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.ingredient_name}</div>
                <div className="font-mono text-xs text-muted-foreground">{item.quantity_base}{item.unit}</div>
              </div>
              <button onClick={() => remove.mutate(item.id)} aria-label={`Remove ${item.ingredient_name} from shopping list`} className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-red-400">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
