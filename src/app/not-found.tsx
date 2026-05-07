import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p
        className="text-8xl font-black mb-4"
        style={{
          background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        404
      </p>
      <h1 className="text-2xl font-black mb-2" style={{ color: "#F0EAD6" }}>
        الصفحة غير موجودة
      </h1>
      <p className="text-sm mb-8" style={{ color: "#9A9070" }}>
        الصفحة التي تبحث عنها غير موجودة أو تمت إزالتها
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full text-sm font-bold transition-all"
        style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
      >
        العودة إلى الرئيسية
      </Link>
    </div>
  );
}
