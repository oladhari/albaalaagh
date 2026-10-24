"use client";
import { useState } from "react";
import { programmeSourceHtml } from "@/lib/programme-source";
export default function ProgrammeSourceInserter({ onInsert }: { onInsert: (html: string) => void }) {
  const [source, setSource] = useState({ programme: "", participants: "", broadcastDate: "", videoUrl: "" });
  const [error, setError] = useState("");
  return <fieldset className="border border-border rounded-lg p-4 space-y-3 mb-5"><legend className="text-gold px-2">بطاقة الحلقة الأصلية</legend><p className="text-sm text-text-muted">أدرج البطاقة والفيديو قرب المقدمة. تاريخ البث مستقل عن تاريخ نشر المقال. راجع الاقتباسات في التسجيل وأضف روابط توقيتها.</p>{([
    ["programme", "اسم البرنامج", "text"], ["participants", "أسماء المشاركين وصفاتهم", "text"], ["broadcastDate", "تاريخ البث الأصلي", "date"], ["videoUrl", "رابط الحلقة الكاملة على YouTube", "url"],
  ] as const).map(([key, label, type]) => <label key={key} className="block text-sm">{label}<input type={type} value={source[key]} onChange={e => setSource({ ...source, [key]: e.target.value })} className="block w-full bg-bg-card border border-border rounded p-2 mt-1" /></label>)}{error && <p role="alert" className="text-red-400">{error}</p>}<button type="button" className="border border-gold text-gold px-4 py-2 rounded" onClick={() => { try { onInsert(programmeSourceHtml(source)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "تعذّر إعداد البطاقة"); } }}>إدراج البطاقة والفيديو في بداية المتن</button></fieldset>;
}
