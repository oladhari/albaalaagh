export default function InterviewsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 rounded-lg mb-3 animate-pulse" style={{ background: "#2E2A18" }} />
        <div className="h-4 w-72 rounded animate-pulse" style={{ background: "#1A1810" }} />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full animate-pulse" style={{ background: "#1A1810", border: "1px solid #2E2A18" }} />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
            <div className="w-full" style={{ aspectRatio: "16/9", background: "#2E2A18" }} />
            <div className="p-4">
              <div className="h-4 rounded mb-2" style={{ background: "#2E2A18" }} />
              <div className="h-4 w-3/4 rounded mb-3" style={{ background: "#2E2A18" }} />
              <div className="h-3 w-1/2 rounded" style={{ background: "#1E1C10" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
