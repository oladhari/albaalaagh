import { describe, expect, it } from "vitest";
import { parseArticleChart, type ArticleChartData } from "@/lib/article-chart";
import { formatNewsContent } from "@/lib/news-content";
import { formatAndSanitize } from "@/lib/sanitize";

const chart: ArticleChartData = {
  type: "bar",
  title: "الدين العمومي",
  caption: "وصف الرسم",
  unit: "مليار دينار تونسي",
  estimateLabel: "تقديرات قانون المالية",
  periods: [{ label: "2025" }, { label: "2026", estimated: true }],
  series: [{ label: "الرصيد", color: "gold", values: [58.1453, 80] }],
  sources: [{ label: "وزارة المالية", url: "https://example.gov/finances?a=1&b=2" }],
  axisMax: 120,
};

const marker = (data: unknown, fallback = "") =>
  `<figure data-article-chart='${JSON.stringify(data).replace(/[&'<]/g, (c) =>
    ({ "&": "&amp;", "'": "&#39;", "<": "&lt;" })[c]!)}'>${fallback}</figure>`;

describe("structured charts in news content", () => {
  it("preserves old formatting and replaces each supported figure in place", () => {
    const oldContent = "<h2>أرقام</h2><p>تحليل</p><figure><img src='/photo.jpg' alt='صورة'></figure>";
    expect(formatNewsContent(oldContent)).toBe(formatAndSanitize(oldContent));

    const html = formatNewsContent(`<p>مقدمة</p>${marker(chart)}<h2>القسم الثاني</h2>${marker(chart)}`);
    expect(html.match(/<svg /g)).toHaveLength(2);
    expect(html).toMatch(/مقدمة[\s\S]*<svg [\s\S]*القسم الثاني[\s\S]*<svg /);
    expect(html).toContain('class="article-chart__bar article-chart__bar--gold article-chart__bar--estimate"');
    expect(html).toContain('dominant-baseline="central">0</text>');
    expect(html).toContain('dominant-baseline="central">120</text>');
    expect(html).toContain(">58.1453</text>");
    expect(html).toContain("<details");
    expect(html).toContain("<th scope=\"row\"><bdi dir=\"ltr\">2026*</bdi>");
    expect(html).toContain("تقديرات قانون المالية");
    expect(html).toContain('href="https://example.gov/finances?a=1&amp;b=2"');
  });

  it("rejects invalid data and keeps a sanitized fallback table", () => {
    const bad = { ...chart, axisMax: 60, sources: [{ label: "رابط", url: "javascript:alert(1)" }] };
    expect(parseArticleChart(JSON.stringify(bad))).toBeNull();
    const html = formatNewsContent(marker(bad, "<table><tr><td>80</td></tr></table><script>alert(1)</script>"));
    expect(html).toContain("<table><tr><td>80</td></tr></table>");
    expect(html).not.toMatch(/<svg|<script/);
  });

  it("escapes CMS text in generated HTML and does not accept raw SVG", () => {
    const html = formatNewsContent(marker({ ...chart, title: '"><img src=x onerror=alert(1)>' }) +
      '<svg onload="alert(1)"><rect /></svg>');
    expect(html.match(/<svg /g)).toHaveLength(1);
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(formatAndSanitize(marker(chart))).not.toContain("data-article-chart");
  });

  it("requires percentage series to total 100 and labels the stacked segments", () => {
    const stacked = { ...chart, type: "stacked-percent", axisMax: undefined, series: [
      { label: "داخلي", color: "domestic", values: [60.8, 64] },
      { label: "خارجي", color: "external", values: [39.2, 36] },
    ] };
    const html = formatNewsContent(marker(stacked));
    expect(html).toContain(">64.0%</text>");
    expect(html).toContain(">36.0%</text>");
    expect(html).toContain(">100%</text>");
    stacked.series[0].values[0] = 20;
    expect(parseArticleChart(JSON.stringify(stacked))).toBeNull();
  });
});
