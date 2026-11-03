export default function SiteLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl" role="status" aria-label="جارٍ تحميل الصفحة">
      <span className="sr-only">جارٍ تحميل الصفحة…</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-border mb-3" />
        <div className="h-4 w-64 max-w-full rounded bg-bg-card mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-xl overflow-hidden border border-border bg-bg-card">
              <div className="aspect-video bg-border" />
              <div className="p-4 space-y-3">
                <div className="h-4 rounded bg-border" />
                <div className="h-4 w-3/4 rounded bg-border" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
