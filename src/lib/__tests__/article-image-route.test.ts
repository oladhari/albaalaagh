import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ news: vi.fn(), facebook: vi.fn(), writer: vi.fn(), lookup: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => null }));
vi.mock("@/lib/ai-image", () => ({ generateNewsImage: m.news, generateFacebookImage: m.facebook, generateWriterArticleImage: m.writer }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: () => { const q = { select: () => q, eq: () => q, single: m.lookup }; return q; } } }));
import { POST } from "@/app/api/admin/images/generate/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/admin/images/generate", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); m.news.mockResolvedValue({ url: "news-landscape", failedPeople: [] }); m.facebook.mockResolvedValue({ url: "news-square", failedPeople: [] }); m.writer.mockResolvedValue({ url: "writer-cover", headlineLines: ["عنوان قصير"] }); });
describe("separate article and news image workflows", () => {
  it("keeps both existing news image targets and their response shape", async () => {
    const people = [{ name: "اسم", url: "https://example.com/photo.jpg" }];
    expect(await (await POST(request({ title: "خبر", excerpt: "ملخص", personPhotos: people }))).json()).toEqual({ url: "news-landscape", failedPeople: [] });
    expect(await (await POST(request({ title: "خبر", excerpt: "ملخص", target: "facebook", personPhotos: people }))).json()).toEqual({ url: "news-square", failedPeople: [] });
    expect(m.news).toHaveBeenCalledWith("خبر", "ملخص", people);
    expect(m.facebook).toHaveBeenCalledWith("خبر", "ملخص", people);
    expect(m.writer).not.toHaveBeenCalled(); expect(m.lookup).not.toHaveBeenCalled();
  });
  it("uses the stored writer identity and photo rather than client-provided substitutes", async () => {
    m.lookup.mockResolvedValue({ data: { name: "الكاتب الحقيقي", image_url: "https://media.albaalaagh.com/writer.jpg" } });
    const response = await POST(request({ title: "مقال", target: "writer", writerId: "writer-id", writerName: "اسم بديل", writerImageUrl: "https://example.com/substitute.jpg" }));
    expect(response.status).toBe(200);
    expect(m.writer).toHaveBeenCalledWith("مقال", "", "الكاتب الحقيقي", "https://media.albaalaagh.com/writer.jpg");
    expect((await response.json()).headlineLines).toEqual(["عنوان قصير"]);
  });
  it("requires an existing writer photo before image generation", async () => {
    m.lookup.mockResolvedValue({ data: { name: "كاتب", image_url: null } });
    expect((await POST(request({ title: "مقال", target: "writer", writerId: "writer-id" }))).status).toBe(400);
    expect(m.writer).not.toHaveBeenCalled();
  });
});
