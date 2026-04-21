// ============================================================
// MealStack · Inventory Manager Page
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InventoryForm from '@/components/inventory/InventoryForm';
import InventoryTable from '@/components/inventory/InventoryTable';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div>
      <div className="border-b border-border bg-background-2 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="font-head text-2xl sm:text-3xl tracking-tight">
          Inventory <em className="text-accent not-italic">Manager</em>
        </h1>
        <p className="mt-1 font-mono text-xs text-subtle">
          Fast-entry form · Unit-normalized · Auto-expiry logic by category
        </p>
      </div>
      <div className="p-4 space-y-6 sm:p-6 sm:space-y-8 lg:p-8">
        <InventoryForm />
        <InventoryTable />
      </div>
    </div>
  );
}
