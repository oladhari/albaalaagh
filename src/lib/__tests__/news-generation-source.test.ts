import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ source: vi.fn(), generate: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => null }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }) } }));
vi.mock("@/lib/news-source", async (original) => ({ ...await original<typeof import("../news-source")>(), fetchNewsSource: mocks.source }));
vi.mock("@/lib/ai/workflows", () => ({ generateNewsDraft: mocks.generate }));

import { POST } from "@/app/api/admin/news/[id]/generate/route";
import { NewsSourceError } from "../news-source";
import { NextRequest } from "next/server";

afterEach(() => vi.resetAllMocks());
const request = () => new NextRequest("https://example.com/api/admin/news/1/generate", { method: "POST", body: JSON.stringify({ tone: "neutral" }) });
const row = { title: "RSS headline", excerpt: "A short snippet", url: "https://example.com/story", source: "Example" };

describe("news generation source handoff", () => {
  it("sends retrieved article text rather than asking AI to invent from the RSS snippet", async () => {
    mocks.single.mockResolvedValue({ data: row });
    mocks.source.mockResolvedValue({ title: "Full headline", articleText: "Complete source evidence", description: "Source description" });
    mocks.generate.mockResolvedValue({ title: "عنوان", excerpt: "ملخص", content: "<p>خبر</p>", needs_internal_review: false });
    const response = await POST(request(), { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(200);
    expect(mocks.source).toHaveBeenCalledWith(row.url);
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ article_text: "Complete source evidence", original_title: "Full headline", excerpt: row.excerpt }), "neutral");
  });

  it("stops before the paid API when the article cannot be retrieved", async () => {
    mocks.single.mockResolvedValue({ data: row });
    mocks.source.mockRejectedValue(new NewsSourceError("Source unavailable"));
    const response = await POST(request(), { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(422);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
