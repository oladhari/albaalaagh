import { describe, expect, it } from "vitest";
import { newsImportDraftUrl, newsImportSourceUrl, newsImportTerms, newsImportUrls } from "../news-import-review";

describe("news import source comparison", () => {
  it("finds the stored RSS URL when Unicode or percent-encoding case differs", () => {
    const source = "https://tunisie-telegraph.com/2026/11/تونس-السجن-17-عاما-لحطاب-بن-عثمان/";
    const rssUrl = new URL(source).toString().replace(/%[\dA-F]{2}/g, (value) => value.toLowerCase());
    expect(newsImportUrls(source)).toContain(rssUrl);
    expect(newsImportUrls(rssUrl)).toContain(new URL(source).toString());
  });

  it("keeps the shared name available for review when the development changes", () => {
    expect(newsImportTerms("تونس- السجن 17 عاما لحطاب بن عثمان")).toEqual(["حطاب", "عثمان"]);
    expect(newsImportTerms("تأجيل محاكمة الحطّاب بن عثمان")).toEqual(["تأجيل", "محاكمة", "حطاب", "عثمان"]);
  });

  it("allows a new draft to have a separate storage URL when the original is occupied", () => {
    const source = "https://example.org/article?id=11";
    const draft = newsImportDraftUrl(source);
    expect(draft).not.toBe(source);
    expect(newsImportSourceUrl(draft)).toBe(source);
  });
});
