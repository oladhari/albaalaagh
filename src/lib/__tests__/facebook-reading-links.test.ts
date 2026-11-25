import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const linkPostSections = [
  ["report", "reports", "التقرير"],
  ["article", "articles", "المقال"],
  ["programme", "from-programmes", "المقال"],
] as const;

const photoPostSections = [
  ["news", "taqrir", "التقرير"],
] as const;

async function adapter(feedSucceeds = true) {
  vi.stubEnv("FB_PAGE_ID", "page-test");
  vi.stubEnv("FB_PAGE_TOKEN", "test-placeholder");
  const calls: Array<{ url: string; body: Record<string, string> }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    if (url.endsWith("/feed")) {
      return feedSucceeds
        ? { ok: true, json: async () => ({ id: "post-test" }) }
        : { ok: false, json: async () => ({ error: "feed rejected" }) };
    }
    return { ok: true, json: async () => ({ id: "photo-test", post_id: "post-test" }) };
  }));
  const { postArticleToFacebook } = await import("../facebook");
  return { calls, postArticleToFacebook };
}

describe("Facebook reading-link placement", () => {
  it.each(photoPostSections)("directs %s photo readers to the comment containing the matching URL", async (type, section, label) => {
    const { calls, postArticleToFacebook } = await adapter();
    await postArticleToFacebook({ type, slug: "selected", title: "العنوان", excerpt: "الملخص", facebook_image: "https://media.albaalaagh.com/cover.jpg" });
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toMatch(/\/photos$/);
    expect(calls[0].body.caption).toContain(`رابط ${label} كاملاً في أول تعليق`);
    expect(calls[0].body.caption).not.toContain("https://www.albaalaagh.com/");
    expect(calls[1].url).toMatch(/\/post-test\/comments$/);
    expect(calls[1].body.message).toBe(`🔗 اقرأ ${label} كاملاً:\nhttps://www.albaalaagh.com/${section}/selected`);
  });

  it.each(photoPostSections)("keeps %s feed links visible without promising a comment", async (type, section, label) => {
    const { calls, postArticleToFacebook } = await adapter();
    await postArticleToFacebook({ type, slug: "selected", title: "العنوان" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/feed$/);
    expect(calls[0].body.link).toBe(`https://www.albaalaagh.com/${section}/selected`);
    expect(calls[0].body.message).toContain(`اقرأ ${label} كاملاً: ${calls[0].body.link}`);
    expect(calls[0].body.message).not.toContain("في أول تعليق");
  });

  it.each(linkPostSections)("%s posts and comments with the canonical URL even when a cover is supplied", async (type, section, label) => {
    const { calls, postArticleToFacebook } = await adapter();
    const canonical = `https://www.albaalaagh.com/${section}/selected`;
    await postArticleToFacebook({
      type, slug: "selected", title: "العنوان", excerpt: "الملخص", writerName: "الكاتب",
      facebook_image: "https://media.albaalaagh.com/cover.jpg",
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toMatch(/\/feed$/);
    expect(calls[0].body).toMatchObject({ link: canonical, message: expect.stringContaining(canonical) });
    expect(calls[0].body.message).toContain("الكاتب");
    if (type === "programme") expect(calls[0].body.message).toContain("#من_برامجنا");
    expect(JSON.stringify(calls[0].body)).not.toContain("cover.jpg");
    expect(calls[1].url).toMatch(/\/post-test\/comments$/);
    expect(calls[1].body.message).toBe(`🔗 اقرأ ${label} كاملاً:\n${canonical}`);
  });

  it("does not attempt a comment when Facebook rejects the link post", async () => {
    const { calls, postArticleToFacebook } = await adapter(false);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await postArticleToFacebook({ type: "article", slug: "selected", title: "العنوان" });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toMatch(/\/feed$/);
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
