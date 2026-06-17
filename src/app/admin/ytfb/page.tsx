"use client";

import { useState, useRef, useEffect } from "react";

type LogEntry = { type: "status" | "done" | "error"; msg: string };

export default function YtFbPage() {
  const [url, setUrl]       = useState("");
  const [log, setLog]       = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const esRef   = useRef<EventSource | null>(null);
  const logRef  = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  // Cleanup EventSource on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || running) return;

    setLog([]);
    setRunning(true);

    const es = new EventSource(`/api/admin/ytfb?url=${encodeURIComponent(url.trim())}`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      try {
        const entry = JSON.parse(event.data as string) as LogEntry;
        setLog((prev) => [...prev, entry]);
        if (entry.type === "done" || entry.type === "error") {
          es.close();
          setRunning(false);
        }
      } catch {}
    };

    es.onerror = () => {
      setLog((prev) => [...prev, { type: "error", msg: "انقطع الاتصال بالخادم" }]);
      es.close();
      setRunning(false);
    };
  }

  const isDone  = log.some((l) => l.type === "done");
  const hasError = log.some((l) => l.type === "error");

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-black mb-2" style={{ color: "#F0EAD6" }}>
        مشاركة يوتيوب على فيسبوك
      </h1>
      <p className="text-sm mb-8" style={{ color: "#9A9070" }}>
        أدخل رابط يوتيوب لتحميل الفيديو ونشره كريل على صفحة البلاغ
      </p>

      {/* Input form */}
      <div className="p-6 rounded-xl mb-6" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            required
            disabled={running}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm"
            style={{
              background: "#0D0C06",
              border: "1px solid #2E2A18",
              color: "#F0EAD6",
              outline: "none",
              direction: "ltr",
            }}
          />
          <button
            type="submit"
            disabled={running || !url.trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all"
            style={{
              background: running
                ? "#2E2A18"
                : "linear-gradient(135deg, #C9A844, #9A7B28)",
              color:  running ? "#9A9070" : "#111008",
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? "جارٍ النشر..." : "مشاركة على فيسبوك"}
          </button>
        </form>

        {/* Info note */}
        <p className="mt-3 text-xs" style={{ color: "#9A9070" }}>
          العملية قد تستغرق عدة دقائق حسب حجم الفيديو — سيظهر التقدم أدناه
        </p>
      </div>

      {/* Live log */}
      {log.length > 0 && (
        <div
          className="p-4 rounded-xl"
          style={{ background: "#111008", border: `1px solid ${isDone ? "#6BCB77" : hasError ? "#FF6B6B" : "#2E2A18"}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold" style={{ color: "#C9A844" }}>سجل العملية</span>
            {isDone && (
              <span className="text-xs font-bold" style={{ color: "#6BCB77" }}>✅ اكتملت</span>
            )}
            {hasError && !isDone && (
              <span className="text-xs font-bold" style={{ color: "#FF6B6B" }}>❌ فشلت</span>
            )}
            {running && (
              <span className="text-xs" style={{ color: "#C9A844" }}>● جارٍ التنفيذ...</span>
            )}
          </div>

          <div
            ref={logRef}
            className="space-y-1.5 font-mono text-xs overflow-y-auto"
            style={{ maxHeight: "360px", direction: "rtl" }}
          >
            {log.map((entry, i) => (
              <div
                key={i}
                className="flex gap-2 leading-relaxed"
                style={{
                  color:
                    entry.type === "done"   ? "#6BCB77" :
                    entry.type === "error"  ? "#FF6B6B" :
                    "#9A9070",
                }}
              >
                <span style={{ opacity: 0.5, flexShrink: 0 }}>
                  {entry.type === "done"   && "✅"}
                  {entry.type === "error"  && "❌"}
                  {entry.type === "status" && "→"}
                </span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
