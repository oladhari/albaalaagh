import { describe, expect, it, vi, afterEach } from "vitest";
import { extractNewsSource, fetchNewsSource, isPublicNewsAddress } from "../news-source";

const story = "Microsoft offers a voluntary exit package to around 60,000 eligible employees. Participation is optional, and the number who will accept is not yet known. Employees in four countries can receive financial support. The company published its announcement on Monday.";

afterEach(() => vi.unstubAllGlobals());

describe("news article extraction", () => {
  it("prefers a balanced article body and excludes unrelated page material", () => {
    const result = extractNewsSource(`<meta content="Microsoft&#8217;s offer" property="og:title"><p>Unrelated navigation and advertising text goes here.</p><div class="entry-content"><div><p>${story}</p></div><p>Optional.</p><p>Second relevant paragraph about financial support.</p></div><p>Unrelated next article promoting an entirely different story.</p>`);
    expect(result.title).toBe("Microsoft’s offer");
    expect(result.articleText).toContain(story);
    expect(result.articleText).toContain("Second relevant paragraph");
    expect(result.articleText).not.toMatch(/Unrelated/);
  });

  it("rejects blocked or empty pages rather than using their titles as articles", () => {
    expect(() => extractNewsSource('<title>Microsoft buyouts</title><p>Access denied</p>')).toThrow();
  });

  it("blocks private, loopback and mapped addresses", () => {
    for (const address of ["127.0.0.1", "10.2.3.4", "169.254.169.254", "172.31.0.1", "192.168.1.1", "100.64.0.1", "::1", "::ffff:127.0.0.1", "fd00::1"])
      expect(isPublicNewsAddress(address)).toBe(false);
    expect(isPublicNewsAddress("8.8.8.8")).toBe(true);
    expect(isPublicNewsAddress("2606:4700:4700::1111")).toBe(true);
  });

  it("does not follow a public redirect to a private endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/internal" } }));
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchNewsSource("https://8.8.8.8/story")).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].redirect).toBe("manual");
  });
});
