"use client";

import { useState } from "react";
import type { ReviewResult, GuestUpdate, GuestDuplicate, GuestUncertain } from "@/app/api/admin/guests/review/route";

type Tab = "updates" | "duplicates" | "uncertain";

const GOLD  = "#C9A844";
const DIM   = "#9A9070";
const GREEN = "#6BCB77";
const RED   = "#FF6B6B";
const BG    = "#1A1810";
const BORDER= "#2E2A18";

function Diff({ label, before, after }: { label: string; before: string; after?: string }) {
  if (!after || after === before) return null;
  return (
    <div className="text-xs mb-1">
      <span style={{ color: DIM }}>{label}: </span>
      <span style={{ color: RED, textDecoration: "line-through", marginLeft: 4 }}>{before || "—"}</span>
      <span style={{ color: GREEN, marginRight: 4 }}> ← </span>
      <span style={{ color: GREEN }}>{after}</span>
    </div>
  );
}

export default function ReviewPanel() {
  const [tab, setTab]               = useState<Tab>("updates");
  const [loading, setLoading]           = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [applying, setApplying]     = useState(false);
  const [result, setResult]         = useState<ReviewResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [approved, setApproved]     = useState<Set<string>>(new Set());
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const runReview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setApproved(new Set());
    setApplyResult(null);

    const merged: ReviewResult = { updates: [], duplicates: [], uncertain: [], hasMore: false, nextOffset: 0, total: 0 };
    let offset = 0;

    try {
      while (true) {
        setLoadingProgress(offset === 0 ? "جارٍ التحليل..." : `جارٍ التحليل... ${offset}/${merged.total || "?"}`);
        const res = await fetch(`/api/admin/guests/review?offset=${offset}`, { method: "POST", credentials: "include" });

        // Guard against non-JSON (timeout HTML pages etc.)
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          setError(`خطأ في الخادم (${res.status}) — حاول مجدداً`);
          break;
        }

        const data: ReviewResult & { error?: string } = await res.json();
        if (!res.ok || data.error) { setError(data.error ?? "خطأ غير معروف"); break; }

        merged.updates    = [...merged.updates,    ...data.updates];
        merged.duplicates = [...merged.duplicates, ...data.duplicates];
        merged.uncertain  = [...merged.uncertain,  ...data.uncertain];
        merged.total      = data.total;

        if (!data.hasMore) break;
        offset = data.nextOffset;
      }

      if (!merged.updates.length && !merged.duplicates.length && !merged.uncertain.length && !error) {
        // completed successfully with results
      }
      setResult(merged);
      setApproved(new Set(merged.updates.map((u) => u.id)));
    } catch (e: any) {
      setError(e?.message ?? "خطأ في الاتصال");
    } finally {
      setLoading(false);
      setLoadingProgress("");
    }
  };

  const toggleApprove = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyApproved = async () => {
    if (!result) return;
    const toApply = result.updates
      .filter((u) => approved.has(u.id))
      .map(({ id, name, title, category }) => ({ id, name, title, category }));

    if (toApply.length === 0) return;
    setApplying(true);
    try {
      const res  = await fetch("/api/admin/guests/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates: toApply }),
      });
      const data = await res.json();
      setApplyResult(`✓ تم تطبيق ${data.applied} تعديل${data.errors?.length ? ` — ${data.errors.length} أخطاء` : ""}`);
      // Remove applied from result
      setResult((prev) => prev ? { ...prev, updates: prev.updates.filter((u) => !approved.has(u.id)) } : prev);
      setApproved(new Set());
    } catch (e: any) {
      setApplyResult(`خطأ: ${e?.message}`);
    } finally {
      setApplying(false);
    }
  };

  const inputStyle = { background: "#111008", border: `1px solid ${BORDER}`, borderRadius: 8 };
  const tabStyle = (active: boolean) => ({
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    background: active ? "rgba(201,168,68,0.12)" : "transparent",
    color: active ? GOLD : DIM,
    border: `1px solid ${active ? GOLD : BORDER}`,
  });

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-base font-bold" style={{ color: GOLD }}>🔍 تدقيق ذكي للضيوف</h2>
        <button
          onClick={runReview}
          disabled={loading}
          className="px-4 py-2 rounded-full text-sm font-bold border"
          style={{ borderColor: GOLD, color: GOLD, background: "rgba(201,168,68,0.08)" }}
        >
          {loading ? `⏳ ${loadingProgress || "جارٍ التحليل..."}` : "تشغيل التدقيق بالذكاء الاصطناعي"}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(255,107,107,0.08)", border: `1px solid rgba(255,107,107,0.3)`, color: RED }}>
          {error}
        </div>
      )}

      {applyResult && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(107,203,119,0.08)", border: `1px solid rgba(107,203,119,0.3)`, color: GREEN }}>
          {applyResult}
        </div>
      )}

      {result && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <button style={tabStyle(tab === "updates")} onClick={() => setTab("updates")}>
              تعديلات مقترحة ({result.updates.length})
            </button>
            <button style={tabStyle(tab === "duplicates")} onClick={() => setTab("duplicates")}>
              مكررات محتملة ({result.duplicates.length})
            </button>
            <button style={tabStyle(tab === "uncertain")} onClick={() => setTab("uncertain")}>
              غير متأكد ({result.uncertain.length})
            </button>
          </div>

          {/* ── Updates tab ── */}
          {tab === "updates" && (
            <div>
              {result.updates.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: DIM }}>لا توجد تعديلات مقترحة</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {result.updates.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 rounded-xl"
                        style={{ ...inputStyle, opacity: approved.has(u.id) ? 1 : 0.5, border: `1px solid ${approved.has(u.id) ? "rgba(201,168,68,0.4)" : BORDER}` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold mb-2" style={{ color: "#F0EAD6" }}>
                              {u.current_name}
                            </p>
                            <Diff label="الاسم"      before={u.current_name}     after={u.name} />
                            <Diff label="الصفة"      before={u.current_title}    after={u.title} />
                            <Diff label="التصنيف"    before={u.current_category} after={u.category} />
                            <p className="text-xs mt-2" style={{ color: DIM }}>💡 {u.reason}</p>
                          </div>
                          <button
                            onClick={() => toggleApprove(u.id)}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{
                              background: approved.has(u.id) ? "rgba(107,203,119,0.15)" : "rgba(255,107,107,0.1)",
                              color: approved.has(u.id) ? GREEN : RED,
                            }}
                          >
                            {approved.has(u.id) ? "✓ مقبول" : "✗ متجاهل"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={applyApproved}
                      disabled={applying || approved.size === 0}
                      className="px-5 py-2.5 rounded-full text-sm font-bold"
                      style={{ background: `linear-gradient(135deg, ${GOLD}, #9A7B28)`, color: "#111008" }}
                    >
                      {applying ? "جارٍ التطبيق..." : `تطبيق ${approved.size} تعديل مقبول`}
                    </button>
                    <button
                      onClick={() => setApproved(new Set(result.updates.map((u) => u.id)))}
                      className="text-xs"
                      style={{ color: DIM }}
                    >
                      قبول الكل
                    </button>
                    <button
                      onClick={() => setApproved(new Set())}
                      className="text-xs"
                      style={{ color: DIM }}
                    >
                      تجاهل الكل
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Duplicates tab ── */}
          {tab === "duplicates" && (
            <div className="space-y-3">
              {result.duplicates.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: DIM }}>لم يُعثر على مكررات</p>
              ) : (
                result.duplicates.map((d, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ ...inputStyle, border: `1px solid rgba(255,107,107,0.25)` }}>
                    <div className="flex items-start gap-3 mb-2">
                      <span style={{ color: RED }}>⚠️</span>
                      <div>
                        {d.names.map((name, j) => (
                          <p key={j} className="text-sm font-bold" style={{ color: "#F0EAD6" }}>{name}</p>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: DIM }}>💡 {d.reason}</p>
                    <p className="text-xs mt-2" style={{ color: DIM }}>احذف المكرر يدوياً من قائمة الضيوف أدناه.</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Uncertain tab ── */}
          {tab === "uncertain" && (
            <div className="space-y-2">
              {result.uncertain.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: DIM }}>كل الضيوف معروفون</p>
              ) : (
                result.uncertain.map((u) => (
                  <div key={u.id} className="p-3 rounded-xl flex items-start gap-3" style={inputStyle}>
                    <span style={{ color: GOLD }}>❓</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#F0EAD6" }}>{u.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: DIM }}>{u.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
