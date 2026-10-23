import { describe, expect, it } from "vitest";
import { articleShareOptions, shareUrl } from "../share-options";
import { reportPath, reportPublicId } from "../reports";
const id = "c8306fdb-205c-42a6-b071-ce859edcbaac";
const compact = id.replaceAll("-", "");
const record = { id, title: "ميزانية الرئاسة", excerpt: "تقرير موثق", slug: "presidency-budget-before-after-july-25", category: "تقارير", cover_image: "https://media.albaalaagh.com/report-cover.jpg" };

describe("article and report sharing", () => {
  it("shares the main report cover on every image channel and a compact canonical URL", () => {
    const opts = articleShareOptions(record);
    expect(opts.type).toBe("report");
    expect(opts.facebook_image).toBe(record.cover_image);
    expect(opts.image).toBe(record.cover_image);
    expect(opts.writerName).toBe("قناة البلاغ الرقمية");
    expect(shareUrl(opts)).toBe(`https://www.albaalaagh.com/reports/${compact}`);
    expect(reportPath(record)).toBe(`/reports/${compact}`);
  });
  it("retains compact CMS slugs and keeps ordinary articles and news URLs distinct", () => {
    expect(reportPublicId({ id, slug: "m1abc123" })).toBe("m1abc123");
    expect(reportPublicId({ id, slug: id })).toBe(compact);
    const opts = articleShareOptions({ ...record, category: "اقتصاد", slug: "essay123", writer: { name: "الكاتب" } });
    expect(opts.type).toBe("article");
    expect(opts.facebook_image).toBe(opts.image);
    expect(opts.writerName).toBe("الكاتب");
    expect(shareUrl(opts)).toBe("https://www.albaalaagh.com/articles/essay123");
    expect(shareUrl({ type: "news", slug: "news123" })).toBe("https://www.albaalaagh.com/taqrir/news123");
  });
});
