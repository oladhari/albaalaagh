"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { STAFF_ROLES } from "@/lib/staff-roles";

export const CATEGORIES = ["وزير", "برلماني", "ناشط", "مفكر", "صحفي", "أكاديمي", "رجل دين", "رئيس دولة", "دبلوماسي", "قاضٍ", "آخر"] as const;

interface Video {
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
}

interface Guest {
  id: string;
  name: string;
  title: string;
  bio: string;
  image_url?: string;
  category: string[];
  tier: "program" | "guest";
  is_staff: boolean;
  program_name?: string;
  program_names?: string[];
  host_id?: string | null;
  program_ids?: string[];
  roles?: string[];
  is_active?: boolean;
}

interface Props {
  videos: Video[];
  initialGuests: Guest[];
}

export default function GuestsManager({ videos, initialGuests }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/youtube/playlists", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPlaylists(data); })
      .catch(() => {});
  }, []);

  const deleteGuest = async (id: string) => {
    setDeleting(id);
    await fetch("/api/admin/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    setGuests((prev) => prev.filter((g) => g.id !== id));
    setDeleting(null);
  };

  const patchGuest = async (id: string, updates: Partial<Pick<Guest, "tier" | "is_staff" | "is_active" | "program_name" | "program_names" | "host_id" | "program_ids" | "roles">>) => {
    setPatching(id);
    const res = await fetch("/api/admin/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      setGuests((prev) => prev.map((g) => g.id === id ? { ...g, ...updates } : g));
    }
    setPatching(null);
  };

  const inputStyle = {
    background: "#111008",
    border: "1px solid #2E2A18",
    color: "#F0EAD6",
    borderRadius: "8px",
    padding: "8px 12px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    fontSize: "13px",
  };

  const runAutoImport = async () => {
    setImportConfirm(false);
    setImporting(true);
    setImportResult(null);

    let offset = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFetched = 0;

    try {
      while (true) {
        const res = await fetch(`/api/admin/guests/import?offset=${offset}`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setImportResult(`خطأ: ${data.error ?? "غير معروف"}`);
          break;
        }

        totalFetched   = data.fetched;
        totalInserted += data.inserted ?? 0;
        totalUpdated  += data.updated  ?? 0;

        if (!data.hasMore) {
          // Done — reload if anything changed
          if (totalInserted > 0 || totalUpdated > 0) {
            window.location.reload();
          } else {
            setImportResult(
              `تم الفحص: ${totalFetched} بث مباشر — أُضيف ${totalInserted} ضيف جديد — حُدِّث ${totalUpdated} — لا جديد`
            );
          }
          break;
        }

        offset = data.nextOffset;
      }
    } catch (err: any) {
      setImportResult(`خطأ في الاتصال: ${err?.message ?? err}`);
    } finally {
      setImporting(false);
    }
  };

  const existingNames = new Set(guests.map((g) => g.name));
  const filteredVideos = videos.filter((v) =>
    search ? v.title.includes(search) : true
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>الضيوف</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#9A9070" }}>{guests.length} ضيف</span>
          {!importConfirm && !importing && (
            <button
              onClick={() => setImportConfirm(true)}
              className="px-4 py-2 rounded-full text-sm font-bold border transition-all"
              style={{ borderColor: "#C9A844", color: "#C9A844", background: "rgba(201,168,68,0.08)" }}
            >
              ⚡ استيراد تلقائي من يوتيوب
            </button>
          )}
        </div>
      </div>

      {/* Inline confirmation */}
      {importConfirm && !importing && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-4" style={{ background: "rgba(201,168,68,0.06)", border: "1px solid rgba(201,168,68,0.3)", color: "#F0EAD6" }}>
          <span className="flex-1">سيتم استيراد الضيوف من جميع البثوث المباشرة. قد يستغرق دقيقة أو أكثر.</span>
          <button onClick={runAutoImport} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}>تأكيد</button>
          <button onClick={() => setImportConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(255,107,107,0.1)", color: "#FF6B6B" }}>إلغاء</button>
        </div>
      )}

      {/* Loading state */}
      {importing && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-3" style={{ background: "rgba(201,168,68,0.06)", border: "1px solid #2E2A18", color: "#C9A844" }}>
          <span className="inline-block animate-spin">⏳</span>
          <span>جارٍ الاستيراد من يوتيوب وتحليل الضيوف... قد يستغرق عدة دقائق — لا تغلق الصفحة</span>
        </div>
      )}

      {importResult && (
        <div className="mb-4 px-4 py-3 rounded-xl text-xs" style={{ background: "rgba(107,203,119,0.08)", border: "1px solid rgba(107,203,119,0.3)", color: "#6BCB77" }}>
          {importResult}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left: guests list ── */}
        <div className="space-y-6">

          {/* Existing guests list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold" style={{ color: "#C9A844" }}>
                الضيوف المُضافون ({guests.length})
              </h2>
              <Link
                href="/admin/guests/new"
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
              >
                + إضافة ضيف جديد
              </Link>
            </div>
            {guests.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "#9A9070" }}>
                لا يوجد ضيوف بعد — اختر مقطعاً من اليمين لإضافة ضيف
              </p>
            ) : (
              <div className="space-y-2">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    className="p-3 rounded-xl space-y-2"
                    style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
                      >
                        {guest.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#F0EAD6" }}>
                          {guest.name}
                        </p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs" style={{ color: "#9A9070" }}>{guest.title}</span>
                          {(Array.isArray(guest.category) ? guest.category : [guest.category]).map((c) => (
                            <span
                              key={c}
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Link
                          href={`/admin/guests/${guest.id}/edit`}
                          className="text-xs px-2 py-1 rounded border"
                          style={{ color: "#9A9070", borderColor: "#2E2A18" }}
                        >
                          تعديل
                        </Link>
                        <button
                          onClick={() => deleteGuest(guest.id)}
                          disabled={deleting === guest.id}
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: "#FF6B6B", background: "rgba(255,107,107,0.08)" }}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                    {/* Tier / staff controls */}
                    <div className="flex items-center gap-2 flex-wrap pt-1" style={{ borderTop: "1px solid #2E2A18" }}>
                      <select
                        value={guest.tier ?? "guest"}
                        disabled={patching === guest.id}
                        onChange={(e) => patchGuest(guest.id, { tier: e.target.value as "program" | "guest" })}
                        className="text-xs rounded px-2 py-1"
                        style={{ background: "#111008", color: "#F0EAD6", border: "1px solid #2E2A18" }}
                      >
                        <option value="guest">ضيف حلقة</option>
                        <option value="program">برنامج دوري</option>
                      </select>
                      {guest.tier === "program" && (
                        <select
                          value={guest.host_id ?? ""}
                          disabled={patching === guest.id}
                          onChange={(e) => patchGuest(guest.id, { host_id: e.target.value || null })}
                          className="text-xs rounded px-2 py-1"
                          style={{ background: "#111008", color: "#F0EAD6", border: "1px solid #2E2A18" }}
                        >
                          <option value="">— المسؤول في البلاغ —</option>
                          {guests.filter((g) => g.is_staff).map((staff) => (
                            <option key={staff.id} value={staff.id}>{staff.name}</option>
                          ))}
                        </select>
                      )}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#9A9070" }}>
                        <input
                          type="checkbox"
                          checked={guest.is_staff ?? false}
                          disabled={patching === guest.id}
                          onChange={(e) => patchGuest(guest.id, { is_staff: e.target.checked })}
                          className="rounded"
                        />
                        طاقم البلاغ (مخفي عن الجمهور)
                      </label>
                      {guest.is_staff && (
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: (guest.is_active ?? true) ? "#6BCB77" : "#FF6B6B" }}>
                          <input
                            type="checkbox"
                            checked={guest.is_active ?? true}
                            disabled={patching === guest.id}
                            onChange={(e) => patchGuest(guest.id, { is_active: e.target.checked })}
                            className="rounded"
                          />
                          {(guest.is_active ?? true) ? "نشط" : "غير نشط"}
                        </label>
                      )}
                      {patching === guest.id && (
                        <span className="text-xs" style={{ color: "#C9A844" }}>جارٍ الحفظ...</span>
                      )}
                    </div>
                    {/* For program hosts — which playlists do they host? (multi-select) */}
                    {guest.tier === "program" && playlists.length > 0 && (() => {
                      const linked = guest.program_names ?? [];
                      return (
                        <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: "1px solid #2E2A18" }}>
                          <span className="text-xs self-center shrink-0" style={{ color: "#9A9070" }}>البرامج:</span>
                          {playlists.map((p) => {
                            const active = linked.includes(p.title);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                disabled={patching === guest.id}
                                onClick={() => {
                                  const next = active
                                    ? linked.filter((x) => x !== p.title)
                                    : [...linked, p.title];
                                  patchGuest(guest.id, { program_names: next });
                                }}
                                className="text-xs px-2 py-0.5 rounded-full border transition-all"
                                style={{
                                  borderColor: active ? "#C9A844" : "#2E2A18",
                                  color:       active ? "#111008" : "#9A9070",
                                  background:  active ? "#C9A844" : "transparent",
                                }}
                              >
                                {p.title}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {/* Program links — which playlists does this guest appear in? */}
                    {guest.tier !== "program" && (() => {
                      const allPrograms = guests.filter((g) => g.tier === "program");
                      if (allPrograms.length === 0) return null;
                      const linked = guest.program_ids ?? [];
                      return (
                        <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: "1px solid #2E2A18" }}>
                          <span className="text-xs self-center" style={{ color: "#9A9070" }}>يظهر في:</span>
                          {allPrograms.map((prog) => {
                            const active = linked.includes(prog.id);
                            return (
                              <button
                                key={prog.id}
                                type="button"
                                disabled={patching === guest.id}
                                onClick={() => {
                                  const next = active
                                    ? linked.filter((x) => x !== prog.id)
                                    : [...linked, prog.id];
                                  patchGuest(guest.id, { program_ids: next });
                                }}
                                className="text-xs px-2 py-0.5 rounded-full border transition-all"
                                style={{
                                  borderColor: active ? "#C9A844" : "#2E2A18",
                                  color:       active ? "#111008" : "#9A9070",
                                  background:  active ? "#C9A844" : "transparent",
                                }}
                              >
                                {prog.program_name ?? prog.name}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {/* Roles — only for staff members */}
                    {guest.is_staff && (() => {
                      const linked = guest.roles ?? [];
                      return (
                        <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: "1px solid #2E2A18" }}>
                          <span className="text-xs self-center shrink-0" style={{ color: "#9A9070" }}>الأدوار:</span>
                          {STAFF_ROLES.map((role) => {
                            const active = linked.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                disabled={patching === guest.id}
                                onClick={() => {
                                  const next = active
                                    ? linked.filter((r) => r !== role)
                                    : [...linked, role];
                                  patchGuest(guest.id, { roles: next });
                                }}
                                className="text-xs px-2 py-0.5 rounded-full border transition-all"
                                style={{
                                  borderColor: active ? "#6BCB77" : "#2E2A18",
                                  color:       active ? "#111008" : "#9A9070",
                                  background:  active ? "#6BCB77" : "transparent",
                                }}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: YouTube videos ── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-bold" style={{ color: "#C9A844" }}>
              مقاطع القناة ({videos.length})
            </h2>
            <input
              style={{ ...inputStyle, width: "auto", flex: 1 }}
              placeholder="بحث في العناوين..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pl-1">
            {filteredVideos.map((video) => {
              const alreadyAdded = [...existingNames].some((name) =>
                video.title.includes(name.split(" ").pop() ?? "")
              );
              return (
                <div
                  key={video.youtube_id}
                  className="w-full text-right flex gap-3 p-3 rounded-xl"
                  style={{
                    background: "#1A1810",
                    border: "1px solid #2E2A18",
                    opacity: alreadyAdded ? 0.45 : 1,
                  }}
                >
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    className="w-16 h-10 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "#F0EAD6" }}>
                      {video.title}
                    </p>
                    {alreadyAdded && (
                      <span className="text-xs" style={{ color: "#6BCB77" }}>✓ مُضاف</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
