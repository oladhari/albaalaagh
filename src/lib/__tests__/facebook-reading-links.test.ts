import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const sections = [
  ["news", "taqrir", "التقرير"],
  ["report", "reports", "التقرير"],
  ["article", "articles", "المقال"],
  ["programme", "from-programmes", "المقال"],
] as const;

async function adapter() {
  vi.stubEnv("FB_PAGE_ID", "page-test");
  vi.stubEnv("FB_PAGE_TOKEN", "test-placeholder");
  const calls: Array<{ url: string; body: Record<string, string> }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return { ok: true, json: async () => ({ id: "photo-test", post_id: "post-test" }) };
  }));
  const { postArticleToFacebook } = await import("../facebook");
  return { calls, postArticleToFacebook };
}

describe("Facebook reading-link placement", () => {
  it.each(sections)("directs %s photo readers to the comment containing the matching URL", async (type, section, label) => {
    const { calls, postArticleToFacebook } = await adapter();
    await postArticleToFacebook({ type, slug: "selected", title: "العنوان", excerpt: "الملخص", facebook_image: "https://media.albaalaagh.com/cover.jpg" });
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toMatch(/\/photos$/);
    expect(calls[0].body.caption).toContain(`رابط ${label} كاملاً في أول تعليق`);
    expect(calls[0].body.caption).not.toContain("https://www.albaalaagh.com/");
    expect(calls[1].url).toMatch(/\/post-test\/comments$/);
    expect(calls[1].body.message).toBe(`🔗 اقرأ ${label} كاملاً:\nhttps://www.albaalaagh.com/${section}/selected`);
  });

  it.each(sections)("keeps %s feed links visible without promising a comment", async (type, section, label) => {
    const { calls, postArticleToFacebook } = await adapter();
    await postArticleToFacebook({ type, slug: "selected", title: "العنوان" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/feed$/);
    expect(calls[0].body.link).toBe(`https://www.albaalaagh.com/${section}/selected`);
    expect(calls[0].body.message).toContain(`اقرأ ${label} كاملاً: ${calls[0].body.link}`);
    expect(calls[0].body.message).not.toContain("في أول تعليق");
  });
});
