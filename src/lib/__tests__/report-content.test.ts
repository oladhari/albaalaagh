import { describe, expect, it } from "vitest";
import { formatReportContent } from "../sanitize";
import { articlePath } from "../reports";

describe("report content boundaries", () => {
  it("keeps accessible tables, source anchors and inline figures", () => {
    const html = formatReportContent('<div class="report-table" role="region" tabindex="0" aria-label="اعتمادات"><table><tr><th scope="row">2020</th><td dir="ltr">79.037</td></tr></table></div><figure><a href="https://media.albaalaagh.com/chart.webp" target="_blank"><img src="https://media.albaalaagh.com/chart.webp" alt="رسم توضيحي" /></a><figcaption>المصدر</figcaption></figure>');
    expect(html).toContain('aria-label="اعتمادات"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('<figcaption>المصدر</figcaption>');
  });
  it("permits the privacy-enhanced YouTube player only", () => {
    const html = formatReportContent('<iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk" title="التقرير"></iframe><iframe src="https://evil.example/embed/abcdefghijk"></iframe><iframe src="//www.youtube-nocookie.com/embed/abcdefghijk"></iframe><iframe src="https://www.youtube-nocookie.com/not-an-embed"></iframe><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">رابط</a>');
    expect((html.match(/<iframe/g) ?? []).length).toBe(1);
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(html).not.toMatch(/evil\.example|javascript:|onerror|<script/);
  });
  it("uses stable report URLs for written and video reports", () => {
    expect(articlePath({ slug: "budget", category: "تقارير" })).toBe("/reports/budget");
    expect(articlePath({ slug: "film", category: "تقارير فيديو" })).toBe("/reports/film");
    expect(articlePath({ slug: "essay", category: "سياسة" })).toBe("/articles/essay");
  });
});
