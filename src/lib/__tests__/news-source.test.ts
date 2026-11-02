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
    // Automattic's public hosting range used by NASA is not 192.0.0.0/24.
    expect(isPublicNewsAddress("192.0.66.161")).toBe(true);
    expect(isPublicNewsAddress("192.0.66.108")).toBe(true);
    expect(isPublicNewsAddress("192.0.0.1")).toBe(false);
    expect(isPublicNewsAddress("192.0.2.1")).toBe(false);
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

describe("publisher article layouts", () => {
  it("extracts Tunisie Telegraph's actual body including its final paragraph, excluding page teasers", () => {
    const body = `<p>${story}</p><p>Verified final detail absent from the headline and RSS excerpt.</p>`;
    const html = `<meta name="description" content="Short RSS-like teaser"><article><p>UNRELATED teaser ${story}</p><div class="td_block_wrap tdb_single_content td-post-content tagdiv-type"><div class="tdb-block-inner td-fix-index">${body}</div></div><div><p>UNRELATED next story ${story}</p></div></article>`;
    const source = extractNewsSource(html, "https://tunisie-telegraph.com/news-tunisie/example/");
    expect(source.articleText).toContain(story);
    expect(source.articleText).toContain("Verified final detail");
    expect(source.articleText).not.toMatch(/UNRELATED|Short RSS-like teaser/);
    expect(() => extractNewsSource(`<title>Headline only</title><meta name="description" content="${story}"><div class="td-post-content"></div>`, "https://tunisie-telegraph.com/news-tunisie/empty/")).toThrow();
  });

  it("reads Mosaïque's matched article body from hydration, never its SEO teaser or a related story", () => {
    const data = { props: { pageProps: { pagedata: { article: { id: 12345, description: `<p>${story}</p><p>Body-only fact omitted from the teaser.</p>`, seoDescription: "Title-only teaser" }, related: [{ description: `<p>UNRELATED ${story}</p>` }] } } } };
    const html = `<meta property="og:title" content="Source headline"><article><div class="tags">Tags</div></article><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
    const source = extractNewsSource(html, "https://www.mosaiquefm.net/ar/news/12345/story");
    expect(source.articleText).toContain("Body-only fact");
    expect(source.articleText).not.toMatch(/UNRELATED|Title-only/);
    expect(() => extractNewsSource(html, "https://www.mosaiquefm.net/ar/news/99999/other")).toThrow();
  });

  it("finds the UN article body after an earlier empty article teaser", () => {
    const html = `<article><h2>Unrelated teaser</h2></article><main><p>${story}</p><p>A confirmed additional source detail.</p></main><footer><p>UNRELATED footer copy</p></footer>`;
    const source = extractNewsSource(html);
    expect(source.articleText).toContain(story);
    expect(source.articleText).not.toMatch(/teaser|footer/);
  });

  it("reads Anadolu's streamed body outside its initial main shell", () => {
    const html = `<main><div>Loading</div></main><div hidden id="S:17"><div class="embed-responsive prose max-w-none"><p>${story}</p><p>Additional article detail.</p></div></div>`;
    expect(extractNewsSource(html).articleText).toContain(story);
  });

  it("keeps France 24's main text but excludes related cards and promotional copy", () => {
    const html = `<main><div class="t-content__main" data-article-content><p>${story}</p><div class="related-stories"><p>UNRELATED ${story}</p></div><aside><p>Promotion ${story}</p></aside></div><p>UNRELATED next story</p></main>`;
    expect(extractNewsSource(html).articleText).toBe(story);
  });

  it("accepts a structured articleBody, but never a long metadata description", () => {
    const schema = { "@type": "NewsArticle", articleBody: story };
    expect(extractNewsSource(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`).articleText).toBe(story);
    expect(() => extractNewsSource(`<meta name="description" content="${story}"><script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", description: story })}</script>`)).toThrow();
  });

  it("rejects a long JavaScript shell and arbitrary page boilerplate", () => {
    expect(() => extractNewsSource(`<main><p>The Earthquake Event Page application supports most recent browsers. ${"Browser help. ".repeat(25)}</p><p>This application requires Javascript.</p></main>`)).toThrow();
    expect(() => extractNewsSource(`<nav><p>${story}</p></nav><div><p>${story}</p></div>`)).toThrow();
  });

  it("retrieves USGS event facts from its official JSON API rather than the empty JS page", async () => {
    const event = { type: "Feature", id: "us12345", properties: { title: "M 6.4 - Example", place: "Example", mag: 6.4, magType: "mww", time: Date.parse("2026-10-31T01:00:00Z"), status: "reviewed" }, geometry: { coordinates: [10, 35, 12] } };
    const fetcher = vi.fn().mockResolvedValue(Response.json(event));
    vi.stubGlobal("fetch", fetcher);
    const source = await fetchNewsSource("https://earthquake.usgs.gov/earthquakes/eventpage/us12345");
    expect(String(fetcher.mock.calls[0][0])).toContain("/fdsnws/event/1/query?format=geojson&eventid=us12345");
    expect(source.articleText).toContain("Magnitude: 6.4");
    expect(source.articleText).toContain("Depth: 12 km");
    expect(source.articleText).not.toContain("requires Javascript");
    expect(source.url).toContain("/eventpage/us12345");
  });
});


describe("official event tables", () => {
  it("reads GDACS labelled evidence without mistaking generic PAGER help for casualties", () => {
    const html = `<title>Earthquake event</title><div id="alert_summary_left"><p>A significant earthquake has a potentially high humanitarian impact based on the affected population and their vulnerability.</p><table><tr><td>GDACS ID</td><td>EQ 12345</td></tr><tr><td>Country</td><td>Example country</td></tr><tr><td>Magnitude</td><td>7.1</td></tr><tr><td>Depth</td><td>12 km</td></tr><tr><td>Population exposed</td><td>100000 people in the affected area</td></tr></table></div><p>UNRELATED generic casualty modelling instructions</p>`;
    const source = extractNewsSource(html, "https://www.gdacs.org/report.aspx?eventtype=EQ&eventid=12345");
    expect(source.articleText).toContain("Magnitude: 7.1");
    expect(source.articleText).toContain("Population exposed: 100000");
    expect(source.articleText).not.toContain("UNRELATED");
  });
});
