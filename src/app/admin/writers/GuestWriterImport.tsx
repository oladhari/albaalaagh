"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { matchesGuestSearch } from "@/lib/guest-search";

interface GuestProfile {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  image_url: string | null;
}

export default function GuestWriterImport() {
  const router = useRouter();
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/admin/writers/from-guest", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذّر تحميل الضيوف");
        if (active) {
          setGuests(data);
          const id = new URLSearchParams(window.location.search).get("guest_id");
          if (id && data.some((g: GuestProfile) => g.id === id)) setSelected(id);
        }
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filteredGuests = guests.filter((g) => matchesGuestSearch(g, query));
  const guest = guests.find((g) => g.id === selected);
  async function importGuest() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/writers/from-guest", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذّرت إضافة الكاتب");
      router.push(`/admin/writers/${data.writer.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر الاتصال بالخادم");
    } finally { setSaving(false); }
  }
  return (
    <section dir="rtl" className="min-w-0 mb-8 rounded-xl border p-5 space-y-3" style={{ background: "#1A1810", borderColor: "#2E2A18" }}>
      <h2 className="font-bold" style={{ color: "#C9A844" }}>إضافة ضيف موجود إلى الكتّاب</h2>
      <p className="text-sm" style={{ color: "#9A9070" }}>استخدم بيانات الضيف وصورته مع الاحتفاظ بملفه ضمن الضيوف.</p>
      <label htmlFor="guest-writer-search" className="block text-sm font-bold" style={{ color: "#F0EAD6" }}>ابحث عن الضيف بالاسم أو الصفة</label>
      <input id="guest-writer-search" type="search" value={query}
        onChange={(e) => setQuery(e.target.value)} disabled={loading || saving}
        placeholder="مثال: أنور الغربي" autoComplete="off"
        aria-controls="guest-writer-results"
        className="w-full min-w-0 rounded-lg border p-3 text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A844]"
        style={{ background: "#111008", borderColor: "#2E2A18", color: "#F0EAD6" }} />
      <p role="status" className="text-xs" style={{ color: "#9A9070" }}>
        {loading ? "جارٍ تحميل الضيوف..." : `${filteredGuests.length} من الضيوف`}
      </p>
      <fieldset id="guest-writer-results" disabled={loading || saving}
        className="min-w-0 max-h-64 overflow-y-auto overflow-x-hidden rounded-lg border"
        style={{ background: "#111008", borderColor: "#2E2A18" }}>
        <legend className="sr-only">اختر الضيف لإضافته إلى الكتّاب</legend>
        {filteredGuests.map((g) => <label key={g.id}
          className="flex min-w-0 cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 hover:bg-white/5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#C9A844]"
          style={{ borderColor: "#2E2A18", background: selected === g.id ? "#2E2815" : undefined }}>
          <input type="radio" name="guest-writer" value={g.id} checked={selected === g.id}
            onChange={() => { setSelected(g.id); setError(""); }}
            className="mt-1.5 shrink-0 accent-[#C9A844]" />
          <span className="min-w-0 text-right [overflow-wrap:anywhere]">
            <span className="block font-bold" style={{ color: "#F0EAD6" }}>{g.name}</span>
            <span className="block text-sm" style={{ color: "#9A9070" }}>{g.title}</span>
          </span>
        </label>)}
        {!loading && !filteredGuests.length && <p className="p-4 text-sm" style={{ color: "#9A9070" }}>لا يوجد ضيف مطابق. جرّب اسمًا آخر أو استخدم نموذج إضافة كاتب أدناه.</p>}
      </fieldset>
      {guest && <div className="flex gap-3 items-start">
        {guest.image_url && <Image src={guest.image_url} alt={guest.name} width={64} height={64} unoptimized className="h-16 w-16 rounded-full object-cover shrink-0" />}
        <div className="min-w-0 [overflow-wrap:anywhere]"><p className="font-bold" style={{ color: "#F0EAD6" }}>{guest.name}</p>
          <p className="text-sm" style={{ color: "#C9A844" }}>{guest.title}</p>
          {guest.bio && <p className="text-sm mt-1" style={{ color: "#9A9070" }}>{guest.bio}</p>}</div>
      </div>}
      {error && <p role="alert" className="text-sm" style={{ color: "#FF6B6B" }}>{error}</p>}
      <button type="button" onClick={importGuest} disabled={!guest || saving}
        className="px-5 py-2 rounded-full text-sm font-bold disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}>
        {saving ? "جارٍ الإضافة..." : "إضافة إلى الكتّاب"}
      </button>
    </section>
  );
}
