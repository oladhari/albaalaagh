import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const m = vi.hoisted(() => ({ auth: vi.fn(), pages: vi.fn(), lookup: vi.fn(), upsert: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: m.auth }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: (table: string) => {
  const q = { select: () => q, like: () => q, order: () => q, range: m.pages,
    in: (...args: unknown[]) => table === "site_videos" ? q : m.remove(...args),
    eq: (_key: string, value: unknown) => value === true ? m.lookup() : q,
    upsert: m.upsert, delete: () => q };
  return q;
} } }));
import { GET, POST } from "@/app/api/admin/tiktok/done/route";

const id = "14f089c4-b9f4-4a7b-9f27-7eea5d367d16";
const request = (body: unknown, origin = "https://example.com") => new NextRequest("https://example.com/api/admin/tiktok/done", {
  method: "POST", headers: { origin }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue(null);
  m.lookup.mockResolvedValue({ data: [{ id }], error: null });
  m.upsert.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue({ error: null });
});
describe("shared TikTok publication marks", () => {
  it("requires admin authentication for reads and writes", async () => {
    m.auth.mockResolvedValue(NextResponse.json({}, { status: 401 }));
    expect((await GET()).status).toBe(401);
    expect((await POST(request({ ids: [id], done: true }))).status).toBe(401);
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it("loads marks beyond the database's default 1000-row limit", async () => {
    m.pages.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ key: `tiktok_done:${i}` })), error: null })
      .mockResolvedValueOnce({ data: [{ key: `tiktok_done:${id}` }], error: null });
    const response = await GET();
    expect((await response.json()).ids).toHaveLength(1001);
    expect(m.pages.mock.calls).toEqual([[0, 999], [1000, 1999]]);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("preserves existing Buffer receipts when migrating manual marks", async () => {
    expect((await POST(request({ ids: [id], done: true }))).status).toBe(200);
    expect(m.upsert).toHaveBeenCalledWith([expect.objectContaining({ key: `tiktok_done:${id}` })], { onConflict: "key", ignoreDuplicates: true });
  });
  it("blocks foreign origins, invalid IDs and unpublished Shorts", async () => {
    expect((await POST(request({ ids: [id], done: true }, "https://foreign.example"))).status).toBe(403);
    expect((await POST(request({ ids: ["invalid"], done: true }))).status).toBe(400);
    m.lookup.mockResolvedValue({ data: [], error: null });
    expect((await POST(request({ ids: [id], done: true }))).status).toBe(400);
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it("removes only explicitly selected marks on undo", async () => {
    expect((await POST(request({ ids: [id], done: false }))).status).toBe(200);
    expect(m.remove).toHaveBeenCalledWith("key", [`tiktok_done:${id}`]);
  });
});
