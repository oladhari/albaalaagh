import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), result: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/lib/share", () => ({ shareToAll: vi.fn() }));
import { GET } from "@/app/api/admin/news/route";

describe("CRM report lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(null);
    const query = { select: vi.fn().mockReturnThis(), eq: mocks.eq, maybeSingle: mocks.result };
    mocks.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
  });

  it("opens a report by slug independently of list status or pagination", async () => {
    const article = { id: "report-id", slug: "muv3kmqg", source: "البلاغ", news_citations: [{ url: "https://example.com" }] };
    mocks.result.mockResolvedValue({ data: article, error: null });
    const response = await GET(new NextRequest("https://www.albaalaagh.com/api/admin/news?slug=muv3kmqg"));
    expect(await response.json()).toEqual(article);
    expect(mocks.eq).toHaveBeenCalledWith("slug", "muv3kmqg");
    expect(mocks.eq).toHaveBeenCalledWith("source", "البلاغ");
    expect(mocks.eq).not.toHaveBeenCalledWith("status", expect.anything());
  });

  it("returns a clear not-found response", async () => {
    mocks.result.mockResolvedValue({ data: null, error: null });
    const response = await GET(new NextRequest("https://www.albaalaagh.com/api/admin/news?slug=missing"));
    expect(response.status).toBe(404);
  });

  it("does not read the database for an unauthenticated request", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const response = await GET(new NextRequest("https://www.albaalaagh.com/api/admin/news?slug=muv3kmqg"));
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
