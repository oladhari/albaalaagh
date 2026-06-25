"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Currency = "eur" | "usd";
type PlanKey  = "basic" | "pro" | "partner";

const PLANS: Record<PlanKey, { nameAr: string; perks: string[]; eur: number; usd: number }> = {
  basic:   { nameAr: "داعم",  eur: 5,  usd: 6,  perks: ["النشرة الأسبوعية", "شكر خاص على قناتنا"] },
  pro:     { nameAr: "شريك", eur: 10, usd: 11, perks: ["النشرة الأسبوعية", "شكر خاص", "محتوى حصري مبكر"] },
  partner: { nameAr: "راعٍ", eur: 20, usd: 22, perks: ["النشرة الأسبوعية", "شكر خاص", "محتوى حصري", "ذكر اسمك كراعٍ"] },
};

const ONE_TIME_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000];

const COSTS = [
  { label: "Streamyard Advanced (بث مباشر)", amount: "$89" },
  { label: "Cloudflare R2 (تخزين الفيديوهات)", amount: "$9" },
  { label: "Vercel (استضافة الموقع)", amount: "$20" },
  { label: "Adobe Creative Cloud (تصميم)", amount: "$55" },
  { label: "فريق الصحفيين والمقدمين", amount: "رواتب" },
];

export default function SupportPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("eur");
  const [oneTimeAmount, setOneTimeAmount] = useState(20);
  const [loading, setLoading] = useState<string | null>(null);

  const symbol = currency === "eur" ? "€" : "$";

  async function handleSubscribe(plan: PlanKey) {
    setLoading(plan);
    const res  = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "subscription", plan, currency }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  async function handleOneTime() {
    setLoading("one_time");
    const res  = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "one_time", currency, amount: oneTimeAmount }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  return (
    <main className="min-h-screen" style={{ background: "#0D0B06" }} dir="rtl">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1
          className="text-4xl sm:text-5xl font-black mb-4"
          style={{
            background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ادعم البلاغ
        </h1>
        <p className="text-lg leading-loose mb-2" style={{ color: "#9A9070" }}>
          نحن منبر إعلامي تونسي مستقل — لا ممول سياسي، لا إعلانات.
        </p>
        <p className="text-base" style={{ color: "#6B6040" }}>
          استمرارنا يعتمد فقط على دعمكم.
        </p>
      </section>

      {/* Costs transparency */}
      <section
        className="max-w-2xl mx-auto mx-4 sm:mx-auto px-4 mb-12 rounded-2xl p-6"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        <h2 className="text-base font-bold mb-4" style={{ color: "#C9A844" }}>
          تكاليفنا الشهرية — بشفافية كاملة
        </h2>
        <div className="space-y-2">
          {COSTS.map((c) => (
            <div key={c.label} className="flex justify-between text-sm">
              <span style={{ color: "#9A9070" }}>{c.label}</span>
              <span className="font-bold" style={{ color: "#E8D5A3" }}>{c.amount}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-4 pt-4 text-sm font-bold flex justify-between"
          style={{ borderTop: "1px solid #2E2A18", color: "#C9A844" }}
        >
          <span>المجموع التقني فقط</span>
          <span>~$173/شهر</span>
        </div>
        <p className="text-xs mt-3" style={{ color: "#6B6040" }}>
          20 مشترك بـ €10/شهر تكفي لتغطية كل التكاليف التقنية وتبقينا مستقلين.
        </p>
      </section>

      {/* Currency toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex rounded-full overflow-hidden" style={{ border: "1px solid #2E2A18" }}>
          {(["eur", "usd"] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className="px-5 py-2 text-sm font-bold transition-all"
              style={{
                background: currency === c ? "#C9A844" : "#1A1810",
                color:      currency === c ? "#0D0B06"  : "#9A9070",
              }}
            >
              {c === "eur" ? "€ يورو" : "$ دولار"}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly plans */}
      <section className="max-w-4xl mx-auto px-4 mb-12">
        <h2 className="text-center text-xl font-bold mb-6" style={{ color: "#E8D5A3" }}>
          اشتراك شهري
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan], i) => {
            const price = currency === "eur" ? plan.eur : plan.usd;
            const isPopular = key === "pro";
            return (
              <div
                key={key}
                className="rounded-2xl p-6 flex flex-col"
                style={{
                  background: isPopular ? "linear-gradient(135deg, #1E1A0E, #2A2410)" : "#1A1810",
                  border: isPopular ? "1px solid #C9A844" : "1px solid #2E2A18",
                  position: "relative",
                }}
              >
                {isPopular && (
                  <span
                    className="absolute -top-3 right-4 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: "#C9A844", color: "#0D0B06" }}
                  >
                    الأكثر اختياراً
                  </span>
                )}
                <div className="mb-4">
                  <p className="text-lg font-black" style={{ color: "#C9A844" }}>{plan.nameAr}</p>
                  <p className="text-3xl font-black mt-1" style={{ color: "#E8D5A3" }}>
                    {symbol}{price}
                    <span className="text-sm font-normal" style={{ color: "#9A9070" }}>/شهر</span>
                  </p>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="text-sm flex gap-2 items-start" style={{ color: "#9A9070" }}>
                      <span style={{ color: "#C9A844" }}>✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={loading === key}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: isPopular ? "#C9A844" : "rgba(201,168,68,0.12)",
                    color: isPopular ? "#0D0B06" : "#C9A844",
                    border: isPopular ? "none" : "1px solid rgba(201,168,68,0.3)",
                    opacity: loading === key ? 0.6 : 1,
                  }}
                >
                  {loading === key ? "جارٍ التحويل..." : `اشترك بـ ${symbol}${price}/شهر`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* One-time */}
      <section className="max-w-md mx-auto px-4 mb-16">
        <div
          className="rounded-2xl p-6"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: "#E8D5A3" }}>تبرع لمرة واحدة</h2>
          <p className="text-sm mb-5" style={{ color: "#6B6040" }}>بدون التزام شهري — مبلغ من اختيارك</p>
          <div className="mb-4">
            <label className="text-sm mb-2 block" style={{ color: "#9A9070" }}>اختر المبلغ</label>
            <select
              value={oneTimeAmount}
              onChange={(e) => setOneTimeAmount(Number(e.target.value))}
              className="w-full rounded-xl px-4 py-3 text-sm font-bold"
              style={{
                background: "#0D0B06",
                border: "1px solid #2E2A18",
                color: "#E8D5A3",
              }}
            >
              {ONE_TIME_AMOUNTS.map((a) => (
                <option key={a} value={a}>{symbol}{a}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleOneTime}
            disabled={loading === "one_time"}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background: "rgba(201,168,68,0.12)",
              color: "#C9A844",
              border: "1px solid rgba(201,168,68,0.3)",
              opacity: loading === "one_time" ? 0.6 : 1,
            }}
          >
            {loading === "one_time" ? "جارٍ التحويل..." : `تبرع بـ ${symbol}${oneTimeAmount}`}
          </button>
        </div>
      </section>

      {/* Footer note */}
      <p className="text-center text-xs pb-12" style={{ color: "#3D3820" }}>
        المدفوعات مؤمّنة عبر Stripe · يمكنك إلغاء الاشتراك في أي وقت
      </p>
    </main>
  );
}
