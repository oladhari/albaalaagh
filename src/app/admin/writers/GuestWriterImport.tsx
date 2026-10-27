"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    <section className="mb-8 rounded-xl border p-5 space-y-3" style={{ background: "#1A1810", borderColor: "#2E2A18" }}>
      <h2 className="font-bold" style={{ color: "#C9A844" }}>إضافة ضيف موجود إلى الكتّاب</h2>
      <p className="text-sm" style={{ color: "#9A9070" }}>استخدم بيانات الضيف وصورته مع الاحتفاظ بملفه ضمن الضيوف.</p>
      <label htmlFor="guest-writer" className="sr-only">اختر الضيف</label>
      <select id="guest-writer" value={selected} disabled={loading || saving}
        onChange={(e) => { setSelected(e.target.value); setError(""); }}
        className="w-full rounded-lg border p-3" style={{ background: "#111008", borderColor: "#2E2A18", color: "#F0EAD6" }}>
        <option value="">{loading ? "جارٍ تحميل الضيوف..." : "اختر ضيفاً"}</option>
        {guests.map((g) => <option key={g.id} value={g.id}>{g.name} — {g.title}</option>)}
      </select>
      {guest && <div className="flex gap-3 items-start">
        {guest.image_url && <Image src={guest.image_url} alt={guest.name} width={64} height={64} unoptimized className="h-16 w-16 rounded-full object-cover shrink-0" />}
        <div><p className="font-bold" style={{ color: "#F0EAD6" }}>{guest.name}</p>
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
