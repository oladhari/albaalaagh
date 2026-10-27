"use client";

import { useEffect, useState } from "react";

interface ShortVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  published_at: string | null;
}

const STORAGE_KEY = "tiktok-manual-done";
const MIGRATION_KEY = 'tiktok-manual-done-migrated-v1';

function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw).map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDone(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0"
      style={{
        borderColor: copied ? "#6BCB77" : "#2E2A18",
        color: copied ? "#6BCB77" : "#9A9070",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? "تم النسخ!" : label}
    </button>
  );
}

export default function TikTokManualList({ videos }: { videos: ShortVideo[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [hideDone, setHideDone] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const cached = loadDone();
      if (active) setDone(cached);
      try {
        const ids = [...cached].filter(id => videos.some(video => video.id === id));
        if (ids.length && localStorage.getItem(MIGRATION_KEY) !== '1') {
          const migration = await fetch('/api/admin/tiktok/done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, done: true }) });
          if (!migration.ok) throw new Error('sync');
        }
        localStorage.setItem(MIGRATION_KEY, '1');
        const response = await fetch('/api/admin/tiktok/done', { cache: 'no-store' });
        if (!response.ok) throw new Error('sync');
        const result = await response.json();
        const merged = new Set<string>([...cached].filter(id => !videos.some(video => video.id === id)));
        for (const id of result.ids) merged.add(String(id));
        if (active) { setDone(merged); setSyncError(''); saveDone(merged); }
      } catch {
        if (active) setSyncError('تعذّرت مزامنة علامات النشر. العلامات المحلية محفوظة.');
      }
    }
    void refresh();
    return () => { active = false; };
  }, [videos]);

  const toggleDone = async (id: string) => {
    setSaving(true);
    try {
      const nextDone = !done.has(id);
      const response = await fetch('/api/admin/tiktok/done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], done: nextDone }) });
      if (!response.ok) throw new Error('sync');
      const next = new Set(done);
      if (nextDone) next.add(id); else next.delete(id);
      setDone(next); saveDone(next); setSyncError('');
    } catch {
      setSyncError('تعذّر حفظ العلامة. يرجى المحاولة مجدداً.');
    } finally { setSaving(false); }
  };

  if (videos.length === 0) {
    return (
      <p className="text-xs" style={{ color: "#9A9070" }}>لا توجد مقاطع شورتس بعد</p>
    );
  }

  const remaining = videos.filter((v) => !done.has(v.id)).length;
  const visible   = hideDone ? videos.filter((v) => !done.has(v.id)) : videos;

  return (
    <div>
      {syncError && <p role="alert" className="text-xs text-red-400 mb-2">{syncError}</p>}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: "#9A9070" }}>
          متبقي {remaining} من {videos.length}
        </p>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#9A9070" }}>
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          إخفاء المكتملة
        </label>
      </div>
      <div className="space-y-3">
        {visible.map((v) => {
          const isDone = done.has(v.id);
          return (
            <div
              key={v.id}
              className="p-3 rounded-lg transition-opacity"
              style={{ background: "#111008", border: "1px solid #2E2A18", opacity: isDone ? 0.4 : 1 }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium" style={{ color: "#F0EAD6" }}>{v.title}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton text={v.title} label="نسخ العنوان" />
                {v.description && v.description !== v.title && (
                  <CopyButton text={v.description} label="نسخ الوصف" />
                )}
                <a
                  href={v.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
                  style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
                >
                  ⬇️ تحميل الفيديو
                </a>
                <button
                  onClick={() => void toggleDone(v.id)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
                  style={{
                    background: isDone ? "rgba(107,203,119,0.15)" : "transparent",
                    color: isDone ? "#6BCB77" : "#9A9070",
                    border: isDone ? "none" : "1px solid #2E2A18",
                  }}
                >
                  {isDone ? "✓ تم النشر — تراجع" : "وضع علامة: تم النشر"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
