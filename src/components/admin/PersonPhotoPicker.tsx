"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface PersonPhoto {
  name: string;
  url: string;
}

interface Guest {
  id: string;
  name: string;
  image_url: string | null;
}

interface Props {
  people: PersonPhoto[];
  onChange: (people: PersonPhoto[]) => void;
}

export default function PersonPhotoPicker({ people, onChange }: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/guests")
      .then((r) => r.json())
      .then((data) => setGuests(Array.isArray(data) ? data.filter((g) => g.image_url) : []))
      .catch(() => {});
  }, []);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return guests
      .filter((g) => g.name.includes(q) && !people.some((p) => p.url === g.image_url))
      .slice(0, 8);
  }, [query, guests, people]);

  function addPerson(p: PersonPhoto) {
    if (people.some((x) => x.url === p.url)) return;
    onChange([...people, p]);
  }

  function removePerson(url: string) {
    onChange(people.filter((p) => p.url !== url));
  }

  function addFromGuest(g: Guest) {
    if (!g.image_url) return;
    addPerson({ name: g.name, url: g.image_url });
    setQuery("");
  }

  function addManualUrl() {
    if (!manualName.trim() || !manualUrl.trim()) return;
    addPerson({ name: manualName.trim(), url: manualUrl.trim() });
    setManualName("");
    setManualUrl("");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!manualName.trim()) {
      alert("اكتب اسم الشخص أولاً قبل رفع الصورة");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
      addPerson({ name: manualName.trim(), url: data.url });
      setManualName("");
    } catch (err: any) {
      alert(err.message ?? "فشل رفع الصورة");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-2 p-3 rounded-lg border" style={{ borderColor: "rgba(201,168,68,0.25)", background: "rgba(201,168,68,0.04)" }} dir="rtl">
      <div className="text-xs font-bold mb-2" style={{ color: "#C9A844" }}>
        👤 أشخاص حقيقيون في الصورة (اختياري)
      </div>

      {people.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {people.map((p) => (
            <div
              key={p.url}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full text-xs"
              style={{ background: "rgba(201,168,68,0.12)", border: "1px solid rgba(201,168,68,0.3)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} className="w-6 h-6 rounded-full object-cover" />
              <span>{p.name}</span>
              <button type="button" onClick={() => removePerson(p.url)} className="opacity-60 hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن ضيف بالاسم..."
          className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border"
          style={{ borderColor: "rgba(201,168,68,0.25)" }}
        />
        {matches.length > 0 && (
          <div
            className="absolute z-10 mt-1 w-full rounded-lg border overflow-hidden"
            style={{ background: "#161010", borderColor: "rgba(201,168,68,0.3)" }}
          >
            {matches.map((g) => (
              <button
                type="button"
                key={g.id}
                onClick={() => addFromGuest(g)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-right hover:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image_url!} alt={g.name} className="w-6 h-6 rounded-full object-cover" />
                <span>{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="اسم شخص غير موجود في قائمة الضيوف"
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm bg-transparent border"
          style={{ borderColor: "rgba(201,168,68,0.25)" }}
        />
        <input
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="رابط صورة (URL)"
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm bg-transparent border"
          style={{ borderColor: "rgba(201,168,68,0.25)" }}
        />
        <button
          type="button"
          onClick={addManualUrl}
          disabled={!manualName.trim() || !manualUrl.trim()}
          className="px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-40"
          style={{ borderColor: "#C9A844", color: "#C9A844" }}
        >
          إضافة رابط
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-40"
          style={{ borderColor: "#C9A844", color: "#C9A844" }}
        >
          {uploading ? "⏳ جاري الرفع..." : "📤 رفع صورة"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>
    </div>
  );
}
