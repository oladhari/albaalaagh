"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteVideoCard from "@/components/ui/SiteVideoCard";

interface Playlist { id: string; name: string; }
interface SiteVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  playlist_id: string | null;
}

interface Props {
  videos: SiteVideo[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  totalCount: number;
  page: number;
  totalPages: number;
  q: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export default function InterviewsClient({
  videos, playlists, activePlaylistId, totalCount, page, totalPages, q, dateFrom, dateTo,
}: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(q ?? "");

  const navigate = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`/interviews?${params.toString()}`);
    });
  }, [router, searchParams]);

  // Debounce the search box so we don't push a route change on every keystroke
  useEffect(() => {
    if (searchInput === (q ?? "")) return;
    const timer = setTimeout(() => {
      navigate({ q: searchInput.trim() || null, page: null });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const setPlaylist = (id: string | null) =>
    navigate({ playlist: id, page: null });

  const goToPage = (p: number) =>
    navigate({ page: p === 1 ? null : String(p) });

  const setDateFrom = (v: string) => navigate({ from: v || null, page: null });
  const setDateTo   = (v: string) => navigate({ to: v || null, page: null });

  const hasFilters = Boolean(q || dateFrom || dateTo);

  const clearFilters = () => {
    setSearchInput("");
    navigate({ q: null, from: null, to: null, page: null });
  };

  const visiblePlaylists = playlists.filter(p => p.id !== "__none__");

  return (
    <>
      {/* Search + date filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4" dir="rtl">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث بعنوان الحلقة…"
          className="flex-1 min-w-[200px] px-4 py-2 rounded-full text-sm outline-none"
          style={{ background: "rgba(201,168,68,0.08)", color: "#EDE7D3", border: "1px solid rgba(201,168,68,0.3)" }}
        />
        <div className="flex items-center gap-2" dir="ltr">
          <input
            type="date"
            value={dateFrom ?? ""}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-full text-sm outline-none"
            style={{ background: "rgba(201,168,68,0.08)", color: "#EDE7D3", border: "1px solid rgba(201,168,68,0.3)" }}
          />
          <span className="text-sm" style={{ color: "#6B6040" }}>→</span>
          <input
            type="date"
            value={dateTo ?? ""}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-full text-sm outline-none"
            style={{ background: "rgba(201,168,68,0.08)", color: "#EDE7D3", border: "1px solid rgba(201,168,68,0.3)" }}
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-full text-sm font-bold shrink-0"
            style={{ background: "rgba(201,168,68,0.08)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Playlist filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1" dir="rtl">
        <button
          onClick={() => setPlaylist(null)}
          className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition-all"
          style={{
            background: !activePlaylistId ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "rgba(201,168,68,0.08)",
            color: !activePlaylistId ? "#111008" : "#C9A844",
            border: "1px solid rgba(201,168,68,0.3)",
          }}
        >
          الكل
        </button>
        {visiblePlaylists.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlaylist(activePlaylistId === p.id ? null : p.id)}
            className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition-all"
            style={{
              background: activePlaylistId === p.id ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "rgba(201,168,68,0.08)",
              color: activePlaylistId === p.id ? "#111008" : "#C9A844",
              border: "1px solid rgba(201,168,68,0.3)",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs mb-4" style={{ color: "#6B6040" }}>
        {totalCount} حلقة
        {activePlaylistId && ` — ${playlists.find(p => p.id === activePlaylistId)?.name ?? ""}`}
      </p>

      {videos.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <p className="text-sm" style={{ color: "#9A9070" }}>
            {hasFilters ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد حلقات بعد في هذا البرنامج"}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity duration-200"
          style={{ opacity: isPending ? 0.4 : 1, pointerEvents: isPending ? "none" : "auto" }}
        >
          {videos.map((v) => (
            <SiteVideoCard key={v.id} {...v} />
          ))}
        </div>
      )}

      {/* Pagination — only shown when not filtering by playlist */}
      {!activePlaylistId && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10" dir="ltr" style={{ opacity: isPending ? 0.5 : 1 }}>
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isPending}
            className="px-4 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-30"
            style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
          >
            ←
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "…")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === "…" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: "#6B6040" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p as number)}
                  className="w-9 h-9 rounded-full text-sm font-bold transition-all"
                  style={{
                    background: page === p ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "rgba(201,168,68,0.08)",
                    color: page === p ? "#111008" : "#C9A844",
                    border: "1px solid rgba(201,168,68,0.3)",
                  }}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || isPending}
            className="px-4 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-30"
            style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
