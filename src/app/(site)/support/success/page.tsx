export default function SupportSuccessPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0D0B06" }}
      dir="rtl"
    >
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(201,168,68,0.15)", border: "1px solid #C9A844" }}
        >
          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="#C9A844" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "#E8D5A3" }}>
          شكراً لدعمك!
        </h1>
        <p className="text-base leading-loose mb-2" style={{ color: "#9A9070" }}>
          دعمك يعني أننا نبقى مستقلين ونواصل عملنا.
        </p>
        <p className="text-sm mb-8" style={{ color: "#6B6040" }}>
          ستصلك النشرة الأسبوعية على بريدك الإلكتروني.
        </p>
        <a
          href="/"
          className="inline-block px-8 py-3 rounded-full font-bold text-sm"
          style={{ background: "#C9A844", color: "#0D0B06" }}
        >
          العودة للموقع
        </a>
      </div>
    </main>
  );
}
