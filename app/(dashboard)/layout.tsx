// ============================================================
// MealStack · Dashboard Shell Layout
// Sidebar + main area. Renders all (dashboard) routes.
// ============================================================

import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background md:flex-row flex-col">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
