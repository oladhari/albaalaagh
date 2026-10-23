"use client";
import { useState } from "react";
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export default function BodyMediaInserter({ onInsert, reports = false }: { onInsert: (html: string) => void; reports?: boolean }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState("image");
  const [error, setError] = useState("");
  function insert() {
    setError("");
    let parsed: URL;
    try { parsed = new URL(url); if (parsed.protocol !== "https:") throw Error(); } catch { setError("أدخل رابط HTTPS صحيحًا ودائمًا"); return; }
    if (!alt.trim()) { setError("أضف عنوانًا وصفيًا بالعربية"); return; }
    let html = "";
    if (kind === "video") {
      const id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : ["www.youtube.com", "youtube.com"].includes(parsed.hostname) ? parsed.searchParams.get("v") : null;
      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) { setError("استعمل رابط فيديو YouTube من نوع watch أو youtu.be"); return; }
      html = `<figure><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${escape(alt)}" allowfullscreen></iframe><figcaption>${escape(caption)}</figcaption></figure>`;
    } else if (kind === "pdf") {
      html = `<p><a class="report-download" href="${escape(url)}">${escape(alt)}</a></p>`;
    } else {
      html = `<figure><a href="${escape(url)}" target="_blank" rel="noopener noreferrer"><img src="${escape(url)}" alt="${escape(alt)}" loading="lazy" /></a><figcaption>${escape(caption)}</figcaption></figure>`;
    }
    onInsert(`\n${html}\n`); setUrl(""); setAlt(""); setCaption("");
  }
  return <fieldset className="border border-border rounded-lg p-4 space-y-3 text-sm"><legend className="text-gold px-2">إضافة وسائط داخل المتن</legend><p className="text-text-muted">تُضاف في نهاية النص ويمكن نقلها إلى الفقرة المناسبة داخل محرر HTML. استعمل روابط التخزين الدائم.</p><select aria-label="نوع الوسائط" value={kind} onChange={e => setKind(e.target.value)} className="bg-bg-card border border-border rounded p-2"><option value="image">صورة أو رسم توضيحي</option><option value="pdf">ملف PDF</option>{reports && <option value="video">فيديو YouTube</option>}</select><input aria-label="رابط الوسائط" placeholder="https://…" dir="ltr" value={url} onChange={e => setUrl(e.target.value)} className="block w-full bg-bg-card border border-border rounded p-2" /><input aria-label="النص البديل أو عنوان الرابط" placeholder="وصف عربي للصورة / عنوان الملف أو الفيديو" value={alt} onChange={e => setAlt(e.target.value)} className="block w-full bg-bg-card border border-border rounded p-2" /><input aria-label="تعليق الصورة ومصدرها" placeholder="تعليق الصورة ومصدرها" value={caption} onChange={e => setCaption(e.target.value)} className="block w-full bg-bg-card border border-border rounded p-2" />{error && <p role="alert" className="text-red-400">{error}</p>}<button type="button" onClick={insert} className="border border-gold text-gold px-4 py-2 rounded">إدراج في المتن</button></fieldset>;
}
