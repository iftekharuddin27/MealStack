export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8" role="status" aria-live="polite">
      <div className="mb-6 h-8 w-52 animate-pulse rounded bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <span className="sr-only">Opening page…</span>
    </div>
  );
}
