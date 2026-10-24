import { describe, expect, it } from "vitest";
import { articlePath, isReport } from "../reports";
import { articleShareOptions, shareUrl } from "../share-options";
import { programmeSourceHtml } from "../programme-source";
import { formatReportContent } from "../sanitize";
const article = { id: "c8306fdb-205c-42a6-b071-ce859edcbaac", slug: "schoolTime202610", category: "من برامجنا", title: "التوقيت المدرسي", cover_image: "https://media.albaalaagh.com/episode.jpg" };
describe("programme articles", () => {
  it("keeps programme articles separate from reports and shares their main cover at the canonical URL", () => {
    expect(isReport(article.category)).toBe(false);
    expect(articlePath(article)).toBe("/from-programmes/schoolTime202610");
    const opts = articleShareOptions(article);
    expect(opts).toMatchObject({ type: "programme", image: article.cover_image, facebook_image: article.cover_image, writerName: "قناة البلاغ الرقمية" });
    expect(shareUrl(opts)).toBe(`https://www.albaalaagh.com${articlePath(article)}`);
    expect(articlePath({ ...article, slug: "old-dashed-slug" })).toBe("/from-programmes/c8306fdb205c42a6b071ce859edcbaac");
  });
  it("retains separate broadcast information and a safe full episode embed without trusting source markup", () => {
    const html = programmeSourceHtml({ programme: '<img src=x onerror="bad">قضايا تربوية', participants: "بلقاسم حسن وأسامة العذاري", broadcastDate: "2026-10-16", videoUrl: "https://youtu.be/eheTmWOujyE" });
    const sanitized = formatReportContent(html);
    expect(sanitized).toContain("2026-10-16");
    expect(sanitized).toContain("https://www.youtube-nocookie.com/embed/eheTmWOujyE");
    expect(sanitized).toContain("&lt;img");
    expect(sanitized).not.toContain('<img src="x"');
    expect(() => programmeSourceHtml({ programme: "برنامج", participants: "ضيف", broadcastDate: "2026-02-30", videoUrl: "https://youtu.be/eheTmWOujyE" })).toThrow();
    expect(() => programmeSourceHtml({ programme: "برنامج", participants: "ضيف", broadcastDate: "2026-10-16", videoUrl: "https://evil.example/watch?v=eheTmWOujyE" })).toThrow();
  });
});
