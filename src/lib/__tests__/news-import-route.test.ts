import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/news/from-url/route";

const { from, fetchSource, generate } = vi.hoisted(() => ({
  from: vi.fn(), fetchSource: vi.fn(), generate: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => null }));
vi.mock("@/lib/news-source", () => ({ fetchNewsSource: fetchSource, NewsSourceError: class extends Error {} }));
vi.mock("@/lib/ai/workflows", () => ({ generateUrlDraft: generate }));

const url = "https://example.org/تونس-السجن-17-عاما-لحطاب-بن-عثمان/";
const pending = {
  id: "rss-item", title: "تونس- السجن 17 عاما لحطاب بن عثمان", url, slug: null,
  status: "pending", source: "تونيزي تلغراف", category: "قضاء", geo: "tunisia",
  published_at: "2026-11-27T21:13:11Z",
};
const older = {
  ...pending, id: "old-story", title: "تأجيل محاكمة الحطاب بن عثمان", status: "approved",
  source: "البلاغ", slug: "earlier-case", url: "https://www.albaalaagh.com/taqrir/earlier-case",
  published_at: "2026-11-17T21:00:00Z",
};

function request(review: boolean) {
  return POST(new NextRequest("https://www.albaalaagh.com/api/admin/news/from-url", {
    method: "POST", body: JSON.stringify({ url, review }),
  }));
}

describe("admin news URL import", () => {
  const insert = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    from.mockImplementation((table: string) => {
      if (table === "news_citations") return { select: () => ({ in: () => ({ limit: async () => ({ data: [] }) }) }) };
      return {
        insert,
        select: () => ({
          in: async () => ({ data: [pending] }),
          or: () => ({ order: () => ({ limit: async () => ({ data: [pending, older] }) }) }),
        }),
      };
    });
    fetchSource.mockResolvedValue({ title: pending.title, description: "Description", articleText: "Source body" });
    generate.mockResolvedValue({ title: "Editorial headline", excerpt: "Opening", content: "Draft text" });
  });

  it("shows the exact pending source and earlier coverage without generating or inserting", async () => {
    const response = await request(true);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      matches: [{ id: pending.id, status: "pending", sameUrl: true }, { id: older.id, status: "approved", sameUrl: false }],
    });
    expect(fetchSource).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("reuses the RSS record when the editor continues", async () => {
    const response = await request(false);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ newsId: pending.id, content: "Draft text", citations: [{ url }] });
    expect(insert).not.toHaveBeenCalled();
  });

  it("opens a manual draft on the same row if the source page cannot be retrieved", async () => {
    fetchSource.mockRejectedValue(new Error("Source returned 403"));
    const response = await request(false);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ newsId: pending.id, sourceUnavailable: true, content: "" });
    expect(generate).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
