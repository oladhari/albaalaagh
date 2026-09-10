"use client";

import { useState, useEffect, useMemo } from "react";
import { TUNISIAN_MONTHS } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  currency: "USD" | "JPY" | "TND";
  billing_type: "subscription" | "usage";
  display_order: number;
  monthly_amount: number | null;
  start_date: string | null;
}

interface Entry {
  id: string;
  service_id: string;
  amount: number;
  entry_date: string;
  note: string | null;
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", JPY: "¥", TND: "د.ت" };

const inputStyle: React.CSSProperties = {
  background: "#111008", border: "1px solid #2E2A18", color: "#F0EAD6",
  borderRadius: "8px", padding: "10px 14px", width: "100%",
  outline: "none", fontFamily: "inherit", fontSize: "14px",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", color: "#9A9070", marginBottom: "6px", fontWeight: 600,
};
const EMPTY_SERVICE_FORM: {
  name: string; currency: Service["currency"]; billing_type: Service["billing_type"];
  monthly_amount: string; start_date: string;
} = { name: "", currency: "USD", billing_type: "usage", monthly_amount: "", start_date: "" };
const EMPTY_ENTRY_FORM = { amount: "", entry_date: new Date().toISOString().slice(0, 10), note: "" };

export default function AdminFinancePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [loading, setLoading]   = useState(true);

  const [fxUsdToTnd, setFxUsdToTnd] = useState("");
  const [fxJpyToTnd, setFxJpyToTnd] = useState("");
  const [savingFx, setSavingFx]     = useState(false);
  const [summaryCurrency, setSummaryCurrency] = useState<"USD" | "JPY" | "TND">("USD");

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm]         = useState({ ...EMPTY_SERVICE_FORM });
  const [savingService, setSavingService]     = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const [addingEntryFor, setAddingEntryFor] = useState<string | null>(null);
  const [entryForm, setEntryForm]           = useState({ ...EMPTY_ENTRY_FORM });
  const [savingEntry, setSavingEntry]       = useState(false);

  const [editingRecurringFor, setEditingRecurringFor] = useState<string | null>(null);
  const [recurringForm, setRecurringForm]   = useState({ monthly_amount: "", start_date: "" });
  const [savingRecurring, setSavingRecurring] = useState(false);

  async function loadAll() {
    setLoading(true);
    const res = await fetch("/api/admin/finance", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setServices(data.services ?? []);
      setEntries(data.entries ?? []);
    }
    setLoading(false);
  }

  async function loadFx() {
    const [u, j, c] = await Promise.all([
      fetch("/api/admin/settings?key=fx_usd_to_tnd", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/settings?key=fx_jpy_to_tnd", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/settings?key=fx_summary_currency", { credentials: "include" }).then(r => r.json()),
    ]);
    if (u.value) setFxUsdToTnd(u.value);
    if (j.value) setFxJpyToTnd(j.value);
    if (c.value === "USD" || c.value === "JPY" || c.value === "TND") setSummaryCurrency(c.value);
  }

  useEffect(() => { loadAll(); loadFx(); }, []);

  async function saveFxRates() {
    setSavingFx(true);
    await Promise.all([
      fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ key: "fx_usd_to_tnd", value: fxUsdToTnd }),
      }),
      fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ key: "fx_jpy_to_tnd", value: fxJpyToTnd }),
      }),
    ]);
    setSavingFx(false);
  }

  async function changeSummaryCurrency(cur: "USD" | "JPY" | "TND") {
    setSummaryCurrency(cur);
    await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ key: "fx_summary_currency", value: cur }),
    });
  }

  function rateFor(currency: string): number {
    if (currency === "TND") return 1;
    if (currency === "USD") return parseFloat(fxUsdToTnd) || 0;
    if (currency === "JPY") return parseFloat(fxJpyToTnd) || 0;
    return 0;
  }

  const entriesByService = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const e of entries) (map[e.service_id] ??= []).push(e);
    return map;
  }, [entries]);

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = { USD: 0, JPY: 0, TND: 0 };
    for (const e of entries) {
      const service = services.find(s => s.id === e.service_id);
      if (!service) continue;
      totals[service.currency] += e.amount;
    }
    return totals;
  }, [entries, services]);

  // كل المبالغ تُحوَّل أولاً للدينار (rateFor يعطي سعر الصرف إلى TND)، ثم تُقسَم
  // على سعر صرف عملة الملخّص لتصل للعملة المطلوب عرض المجموع بها.
  const grandTotalTnd = useMemo(() => {
    return Object.entries(totalsByCurrency).reduce((sum, [cur, amt]) => sum + amt * rateFor(cur), 0);
  }, [totalsByCurrency, fxUsdToTnd, fxJpyToTnd]);

  const missingRates = !fxUsdToTnd || !fxJpyToTnd;

  const grandTotalSummary = missingRates ? 0 : grandTotalTnd / rateFor(summaryCurrency);

  function toSummary(tndAmount: number): number {
    return tndAmount / rateFor(summaryCurrency);
  }

  // اشتراك بـ monthly_amount و start_date يُسقَط تلقائياً على كل شهر من بدايته حتى الآن،
  // إلا إذا وُجد سجلّ فعلي لنفس الخدمة في ذلك الشهر فيُستعمل السجلّ الفعلي بدلاً منه.
  const monthlyBreakdown = useMemo(() => {
    const monthKeys = new Set<string>();
    for (const e of entries) monthKeys.add(e.entry_date.slice(0, 7));
    const nowMonth = new Date().toISOString().slice(0, 7);
    for (const s of services) {
      if (s.billing_type === "subscription" && s.monthly_amount && s.start_date) {
        let month = s.start_date.slice(0, 7);
        while (month <= nowMonth) {
          monthKeys.add(month);
          const [y, m] = month.split("-").map(Number);
          const next = new Date(Date.UTC(y, m, 1));
          month = next.toISOString().slice(0, 7);
        }
      }
    }

    return Array.from(monthKeys)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12) // آخر 12 شهراً فقط — تفادياً لجدول طويل بأشهر قديمة متطابقة القيم
      .map(month => {
        const totals: Record<string, number> = { USD: 0, JPY: 0, TND: 0 };
        for (const s of services) {
          const monthEntries = entries.filter(e => e.service_id === s.id && e.entry_date.slice(0, 7) === month);
          if (monthEntries.length > 0) {
            totals[s.currency] += monthEntries.reduce((sum, e) => sum + e.amount, 0);
          } else if (s.billing_type === "subscription" && s.monthly_amount && s.start_date && s.start_date.slice(0, 7) <= month) {
            totals[s.currency] += s.monthly_amount;
          }
        }
        const [year, m] = month.split("-");
        const tnd = Object.entries(totals).reduce((sum, [cur, amt]) => sum + amt * rateFor(cur), 0);
        return { month, label: `${TUNISIAN_MONTHS[parseInt(m, 10) - 1]} ${year}`, totals, summary: toSummary(tnd) };
      });
  }, [entries, services, fxUsdToTnd, fxJpyToTnd, summaryCurrency]);

  async function handleSaveService() {
    if (!serviceForm.name.trim()) { setError("اسم الخدمة مطلوب"); return; }
    setSavingService(true); setError(null);
    try {
      const res = await fetch("/api/admin/finance/services", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...serviceForm, name: serviceForm.name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "حدث خطأ"); return; }
      setShowServiceForm(false); setServiceForm({ ...EMPTY_SERVICE_FORM });
      loadAll();
    } catch { setError("تعذّر الاتصال بالخادم"); }
    finally { setSavingService(false); }
  }

  async function deleteService(id: string, name: string) {
    if (!confirm(`حذف خدمة "${name}"؟ سيتم حذف كل مصاريفها المسجّلة أيضاً.`)) return;
    await fetch(`/api/admin/finance/services/${id}`, { method: "DELETE", credentials: "include" });
    loadAll();
  }

  async function handleAddEntry(serviceId: string) {
    if (!entryForm.amount || isNaN(Number(entryForm.amount))) return;
    setSavingEntry(true);
    try {
      await fetch("/api/admin/finance/entries", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ service_id: serviceId, amount: entryForm.amount, entry_date: entryForm.entry_date, note: entryForm.note || null }),
      });
      setAddingEntryFor(null); setEntryForm({ ...EMPTY_ENTRY_FORM });
      loadAll();
    } finally { setSavingEntry(false); }
  }

  async function saveRecurring(serviceId: string) {
    setSavingRecurring(true);
    try {
      await fetch(`/api/admin/finance/services/${serviceId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ monthly_amount: recurringForm.monthly_amount, start_date: recurringForm.start_date }),
      });
      setEditingRecurringFor(null);
      loadAll();
    } finally { setSavingRecurring(false); }
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/admin/finance/entries/${id}`, { method: "DELETE", credentials: "include" });
    loadAll();
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>المصاريف</h1>
          <p className="text-xs mt-1" style={{ color: "#9A9070" }}>تكاليف الخدمات (Claude، OpenAI، Grok، Gemini...) بعملتها الحقيقية</p>
        </div>
        <button
          onClick={() => { setShowServiceForm(true); setServiceForm({ ...EMPTY_SERVICE_FORM }); setError(null); }}
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + خدمة جديدة
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
        <div className="flex flex-wrap items-center gap-6 mb-4">
          {(["USD", "JPY", "TND"] as const).map(cur => (
            totalsByCurrency[cur] > 0 && (
              <div key={cur}>
                <p className="text-xs" style={{ color: "#9A9070" }}>إجمالي {cur}</p>
                <p className="text-lg font-black" style={{ color: "#C9A844" }}>
                  {CURRENCY_SYMBOL[cur]} {totalsByCurrency[cur].toFixed(2)}
                </p>
              </div>
            )
          ))}
          <div className="mr-auto">
            <p className="text-xs" style={{ color: "#9A9070" }}>المجموع الكلي ({summaryCurrency})</p>
            <p className="text-2xl font-black" style={{ color: "#F0EAD6" }}>
              {missingRates ? "—" : `${CURRENCY_SYMBOL[summaryCurrency]} ${grandTotalSummary.toFixed(summaryCurrency === "JPY" ? 0 : 2)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-3" style={{ borderTop: "1px solid #2E2A18" }}>
          <div style={{ width: "160px" }}>
            <label style={labelStyle}>سعر الصرف USD → TND</label>
            <input style={inputStyle} type="number" step="0.001" placeholder="مثال: 3.10" value={fxUsdToTnd}
              onChange={e => setFxUsdToTnd(e.target.value)} />
          </div>
          <div style={{ width: "160px" }}>
            <label style={labelStyle}>سعر الصرف JPY → TND</label>
            <input style={inputStyle} type="number" step="0.0001" placeholder="مثال: 0.021" value={fxJpyToTnd}
              onChange={e => setFxJpyToTnd(e.target.value)} />
          </div>
          <div style={{ width: "160px" }}>
            <label style={labelStyle}>عملة المجموع الرئيسي</label>
            <select style={inputStyle} value={summaryCurrency}
              onChange={e => changeSummaryCurrency(e.target.value as "USD" | "JPY" | "TND")}>
              <option value="USD">USD ($)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="TND">TND (د.ت)</option>
            </select>
          </div>
          <button onClick={saveFxRates} disabled={savingFx}
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}>
            {savingFx ? "جارٍ الحفظ..." : "حفظ الأسعار"}
          </button>
          {missingRates && (
            <span className="text-xs" style={{ color: "#FF6B6B" }}>
              أدخل سعري الصرف (USD→TND و JPY→TND) واضغط حفظ لعرض المجموع الكلي
            </span>
          )}
        </div>
      </div>

      {/* Monthly breakdown */}
      {monthlyBreakdown.length > 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <p className="text-sm font-bold mb-4" style={{ color: "#F0EAD6" }}>المصاريف حسب الشهر</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2E2A18" }}>
                  <th className="text-right py-2 pr-2" style={{ color: "#9A9070" }}>الشهر</th>
                  <th className="text-right py-2 px-2" style={{ color: "#9A9070" }}>USD</th>
                  <th className="text-right py-2 px-2" style={{ color: "#9A9070" }}>JPY</th>
                  <th className="text-right py-2 px-2" style={{ color: "#9A9070" }}>TND</th>
                  <th className="text-right py-2 pl-2" style={{ color: "#9A9070" }}>المجموع ({summaryCurrency})</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map(row => (
                  <tr key={row.month} style={{ borderBottom: "1px solid #2E2A18" }}>
                    <td className="py-2 pr-2 font-bold" style={{ color: "#C9A844" }}>{row.label}</td>
                    <td className="py-2 px-2" style={{ color: row.totals.USD ? "#F0EAD6" : "#6B6040" }}>
                      {row.totals.USD ? `$${row.totals.USD.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2 px-2" style={{ color: row.totals.JPY ? "#F0EAD6" : "#6B6040" }}>
                      {row.totals.JPY ? `¥${row.totals.JPY.toFixed(0)}` : "—"}
                    </td>
                    <td className="py-2 px-2" style={{ color: row.totals.TND ? "#F0EAD6" : "#6B6040" }}>
                      {row.totals.TND ? `${row.totals.TND.toFixed(2)} د.ت` : "—"}
                    </td>
                    <td className="py-2 pl-2 font-bold" style={{ color: "#F0EAD6" }}>
                      {missingRates ? "—" : `${CURRENCY_SYMBOL[summaryCurrency]} ${row.summary.toFixed(summaryCurrency === "JPY" ? 0 : 2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New service form */}
      {showServiceForm && (
        <div className="mb-8 p-6 rounded-2xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <h2 className="text-lg font-bold mb-5" style={{ color: "#F0EAD6" }}>خدمة جديدة</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>اسم الخدمة *</label>
              <input style={inputStyle} placeholder="مثال: Claude API" value={serviceForm.name}
                onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>العملة</label>
              <select style={inputStyle} value={serviceForm.currency}
                onChange={e => setServiceForm(p => ({ ...p, currency: e.target.value as Service["currency"] }))}>
                <option value="USD">USD ($)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="TND">TND (د.ت)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>نوع الفوترة</label>
              <select style={inputStyle} value={serviceForm.billing_type}
                onChange={e => setServiceForm(p => ({ ...p, billing_type: e.target.value as Service["billing_type"] }))}>
                <option value="usage">حسب الاستخدام</option>
                <option value="subscription">اشتراك شهري</option>
              </select>
            </div>
            {serviceForm.billing_type === "subscription" && (
              <>
                <div>
                  <label style={labelStyle}>القيمة الشهرية ({serviceForm.currency})</label>
                  <input style={inputStyle} type="number" step="0.01" placeholder="تُحسب كل شهر تلقائياً"
                    value={serviceForm.monthly_amount}
                    onChange={e => setServiceForm(p => ({ ...p, monthly_amount: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>تاريخ بداية الاشتراك</label>
                  <input style={inputStyle} type="date" value={serviceForm.start_date}
                    onChange={e => setServiceForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setShowServiceForm(false); setError(null); }}
              className="px-5 py-2 rounded-full text-sm font-bold border"
              style={{ borderColor: "#2E2A18", color: "#9A9070" }}>إلغاء</button>
            <button onClick={handleSaveService} disabled={savingService || !serviceForm.name.trim()}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{
                background: serviceForm.name.trim() ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "#2E2A18",
                color: serviceForm.name.trim() ? "#111008" : "#9A9070",
              }}>
              {savingService ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}

      {/* Services list */}
      {loading ? (
        <div className="text-center py-12" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>
      ) : services.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <p className="text-sm" style={{ color: "#9A9070" }}>لا توجد خدمات بعد. أضف أول خدمة.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map(service => {
            const serviceEntries = (entriesByService[service.id] ?? []);
            const serviceTotal = serviceEntries.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={service.id} className="rounded-xl overflow-hidden" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
                <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-2" style={{ borderBottom: "1px solid #2E2A18" }}>
                  <div>
                    <p className="font-black text-base" style={{ color: "#C9A844" }}>{service.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>
                      {service.billing_type === "subscription" ? "اشتراك شهري" : "حسب الاستخدام"} · {serviceEntries.length} سجلّ
                      {service.billing_type === "subscription" && service.monthly_amount && service.start_date && (
                        <> · يُحتسب تلقائياً {CURRENCY_SYMBOL[service.currency]}{service.monthly_amount} كل شهر منذ {service.start_date}</>
                      )}
                      {service.billing_type === "subscription" && !(service.monthly_amount && service.start_date) && (
                        <span style={{ color: "#FF6B6B" }}> · لم يُحدَّد الاحتساب الشهري التلقائي بعد</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-sm" style={{ color: "#F0EAD6" }}>
                      {CURRENCY_SYMBOL[service.currency]} {serviceTotal.toFixed(2)}
                    </p>
                    {service.billing_type === "subscription" && (
                      <button
                        onClick={() => {
                          if (editingRecurringFor === service.id) { setEditingRecurringFor(null); return; }
                          setEditingRecurringFor(service.id);
                          setRecurringForm({
                            monthly_amount: service.monthly_amount != null ? String(service.monthly_amount) : "",
                            start_date: service.start_date ?? "",
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}>
                        ⚙ الاحتساب الشهري
                      </button>
                    )}
                    <button
                      onClick={() => { setAddingEntryFor(addingEntryFor === service.id ? null : service.id); setEntryForm({ ...EMPTY_ENTRY_FORM }); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}>
                      + إضافة مصروف
                    </button>
                    <button onClick={() => deleteService(service.id, service.name)}
                      className="p-1.5 rounded-lg text-xs" style={{ background: "rgba(255,100,100,0.1)", color: "#FF6B6B" }}>🗑</button>
                  </div>
                </div>

                {editingRecurringFor === service.id && (
                  <div className="px-5 py-4 flex flex-wrap items-end gap-3" style={{ background: "#111008" }}>
                    <div style={{ width: "160px" }}>
                      <label style={labelStyle}>القيمة الشهرية ({service.currency})</label>
                      <input style={inputStyle} type="number" step="0.01" value={recurringForm.monthly_amount}
                        onChange={e => setRecurringForm(p => ({ ...p, monthly_amount: e.target.value }))} />
                    </div>
                    <div style={{ width: "160px" }}>
                      <label style={labelStyle}>تاريخ البداية</label>
                      <input style={inputStyle} type="date" value={recurringForm.start_date}
                        onChange={e => setRecurringForm(p => ({ ...p, start_date: e.target.value }))} />
                    </div>
                    <button onClick={() => saveRecurring(service.id)} disabled={savingRecurring}
                      className="px-4 py-2.5 rounded-lg text-sm font-bold"
                      style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}>
                      {savingRecurring ? "..." : "حفظ"}
                    </button>
                    <p className="text-xs w-full" style={{ color: "#9A9070" }}>
                      سيُحتسب هذا المبلغ تلقائياً في كل شهر من تاريخ البداية حتى الآن، إلا إذا أضفت سجلّاً فعلياً لنفس الشهر (يُستعمل عندها السجلّ الفعلي بدل القيمة الثابتة).
                    </p>
                  </div>
                )}

                {addingEntryFor === service.id && (
                  <div className="px-5 py-4 flex flex-wrap items-end gap-3" style={{ background: "#111008" }}>
                    <div style={{ width: "140px" }}>
                      <label style={labelStyle}>المبلغ ({service.currency})</label>
                      <input style={inputStyle} type="number" step="0.01" value={entryForm.amount}
                        onChange={e => setEntryForm(p => ({ ...p, amount: e.target.value }))} />
                    </div>
                    <div style={{ width: "160px" }}>
                      <label style={labelStyle}>التاريخ</label>
                      <input style={inputStyle} type="date" value={entryForm.entry_date}
                        onChange={e => setEntryForm(p => ({ ...p, entry_date: e.target.value }))} />
                    </div>
                    <div className="flex-1" style={{ minWidth: "160px" }}>
                      <label style={labelStyle}>ملاحظة (اختياري)</label>
                      <input style={inputStyle} placeholder="مثال: مفتاح albaalaagh" value={entryForm.note}
                        onChange={e => setEntryForm(p => ({ ...p, note: e.target.value }))} />
                    </div>
                    <button onClick={() => handleAddEntry(service.id)} disabled={savingEntry || !entryForm.amount}
                      className="px-4 py-2.5 rounded-lg text-sm font-bold"
                      style={{
                        background: entryForm.amount ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "#2E2A18",
                        color: entryForm.amount ? "#111008" : "#9A9070",
                      }}>
                      {savingEntry ? "..." : "حفظ"}
                    </button>
                  </div>
                )}

                {serviceEntries.length > 0 && (
                  <div className="px-5 py-3">
                    {serviceEntries.map(e => (
                      <div key={e.id} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: "1px solid #2E2A18" }}>
                        <div className="flex items-center gap-3">
                          <span style={{ color: "#9A9070" }}>{e.entry_date}</span>
                          {e.note && <span style={{ color: "#6B6040" }}>· {e.note}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold" style={{ color: "#F0EAD6" }}>
                            {CURRENCY_SYMBOL[service.currency]} {e.amount.toFixed(2)}
                          </span>
                          <button onClick={() => deleteEntry(e.id)}
                            className="text-xs" style={{ color: "#FF6B6B" }}>حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
