import ShoppingList from '@/components/shopping/ShoppingList';

export default function ShoppingListPage() {
  return (
    <div>
      <header className="border-b border-border bg-background-2 px-4 py-5 sm:px-6 lg:px-8">
        <h1 className="font-head text-2xl tracking-tight sm:text-3xl">Shopping <em className="not-italic text-accent">List</em></h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">Missing recipe ingredients · Quantities merge automatically</p>
      </header>
      <div className="p-4 sm:p-6 lg:p-8"><ShoppingList /></div>
    </div>
  );
}
