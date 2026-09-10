"use client";

import { useState, useEffect, useMemo } from "react";

interface Service {
  id: string;
  name: string;
  currency: "USD" | "JPY" | "TND";
  billing_type: "subscription" | "usage";
  display_order: number;
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
const EMPTY_SERVICE_FORM: { name: string; currency: Service["currency"]; billing_type: Service["billing_type"] } =
  { name: "", currency: "USD", billing_type: "usage" };
const EMPTY_ENTRY_FORM = { amount: "", entry_date: new Date().toISOString().slice(0, 10), note: "" };

export default function AdminFinancePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [loading, setLoading]   = useState(true);

  const [fxUsdToTnd, setFxUsdToTnd] = useState("");
  const [fxJpyToTnd, setFxJpyToTnd] = useState("");
  const [savingFx, setSavingFx]     = useState(false);

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm]         = useState({ ...EMPTY_SERVICE_FORM });
  const [savingService, setSavingService]     = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const [addingEntryFor, setAddingEntryFor] = useState<string | null>(null);
  const [entryForm, setEntryForm]           = useState({ ...EMPTY_ENTRY_FORM });
  const [savingEntry, setSavingEntry]       = useState(false);

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
    const [u, j] = await Promise.all([
      fetch("/api/admin/settings?key=fx_usd_to_tnd", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/settings?key=fx_jpy_to_tnd", { credentials: "include" }).then(r => r.json()),
    ]);
    if (u.value) setFxUsdToTnd(u.value);
    if (j.value) setFxJpyToTnd(j.value);
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

  const grandTotalTnd = useMemo(() => {
    return Object.entries(totalsByCurrency).reduce((sum, [cur, amt]) => sum + amt * rateFor(cur), 0);
  }, [totalsByCurrency, fxUsdToTnd, fxJpyToTnd]);

  const missingRates = (totalsByCurrency.USD > 0 && !fxUsdToTnd) || (totalsByCurrency.JPY > 0 && !fxJpyToTnd);

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
            <p className="text-xs" style={{ color: "#9A9070" }}>المجموع الكلي (د.ت)</p>
            <p className="text-2xl font-black" style={{ color: "#F0EAD6" }}>
              {missingRates ? "—" : `${grandTotalTnd.toFixed(2)} د.ت`}
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
          <button onClick={saveFxRates} disabled={savingFx}
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}>
            {savingFx ? "جارٍ الحفظ..." : "حفظ الأسعار"}
          </button>
          {missingRates && (
            <span className="text-xs" style={{ color: "#FF6B6B" }}>
              أدخل سعر الصرف لعرض المجموع الكلي بالدينار
            </span>
          )}
        </div>
      </div>

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
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-sm" style={{ color: "#F0EAD6" }}>
                      {CURRENCY_SYMBOL[service.currency]} {serviceTotal.toFixed(2)}
                    </p>
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
