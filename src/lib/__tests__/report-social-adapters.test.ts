import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });
describe("report social adapters", () => {
  it.each(["report", "programme"] as const)("sends the main cover and canonical URL for %s to enabled SNS", async (type) => {
    for (const key of ["FB_PAGE_ID", "FB_PAGE_TOKEN", "TELEGRAM_BOT_TOKEN", "X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET", "LINKEDIN_ACCESS_TOKEN", "LINKEDIN_PERSON_ID"]) vi.stubEnv(key, "test-placeholder");
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : {} });
      const data = url.includes("instagram_business_account") ? { instagram_business_account: { id: "ig-test" } } : url.includes("status_code") ? { status_code: "FINISHED" } : { id: "post-test", post_id: "post-test" };
      return { ok: true, json: async () => data };
    }));
    const { postArticleToFacebook } = await import("../facebook");
    const { postArticleToInstagram } = await import("../instagram");
    const { postToTelegram } = await import("../telegram");
    const { postToX } = await import("../twitter");
    const { postToLinkedIn } = await import("../linkedin");
    const opts = { title: "تقرير موثّق", excerpt: "ملخص", slug: "c8306fdb205c42a6b071ce859edcbaac", type, facebook_image: "https://media.albaalaagh.com/landscape.jpg", image: "https://media.albaalaagh.com/landscape.jpg" };
    await postArticleToFacebook(opts); await postArticleToInstagram(opts); await postToTelegram(opts); await postToX(opts); await postToLinkedIn(opts);
    const canonical = `https://www.albaalaagh.com/${type === "programme" ? "from-programmes" : "reports"}/${opts.slug}`;
    expect(calls.find(c => c.url.endsWith("/photos"))?.body.url).toBe(opts.image);
    expect(calls.find(c => c.url.endsWith("/comments"))?.body.message).toContain(canonical);
    expect(calls.find(c => c.url.endsWith("/media"))?.body).toMatchObject({ image_url: opts.image, caption: expect.stringContaining(canonical) });
    expect(calls.find(c => c.url.endsWith("/sendPhoto"))?.body).toMatchObject({ photo: opts.image, caption: expect.stringContaining(canonical) });
    expect(calls.find(c => c.url.endsWith("/tweets"))?.body.text).toContain(canonical);
    expect(JSON.stringify(calls.find(c => c.url.endsWith("/ugcPosts"))?.body)).toContain(canonical);
    expect(JSON.stringify(calls)).not.toContain("/taqrir/");
    expect(JSON.stringify(calls)).not.toContain("/articles/");
  });
});
