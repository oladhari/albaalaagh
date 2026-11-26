import { DomUtils, parseDocument } from "htmlparser2";
import { ArticleChart } from "@/components/ui/ArticleChart";
import { parseArticleChart } from "@/lib/article-chart";
import { formatAndSanitize } from "@/lib/sanitize";

export function formatNewsContent(content: string): string {
  const html = formatAndSanitize(content, { allowArticleCharts: true });
  if (!html.includes(" data-article-chart=")) return html;

  const doc = parseDocument(html, { withStartIndices: true, withEndIndices: true });
  const markers = DomUtils.findAll((element) =>
    element.name === "figure" && Object.hasOwn(element.attribs, "data-article-chart"), doc.children);
  let offset = 0;
  let rendered = "";
  for (const marker of markers) {
    const { startIndex, endIndex } = marker;
    if (startIndex == null || endIndex == null || startIndex < offset) continue;
    const chart = parseArticleChart(marker.attribs["data-article-chart"]);
    if (!chart) continue;
    rendered += html.slice(offset, startIndex) + ArticleChart(chart);
    offset = endIndex + 1;
  }
  return rendered + html.slice(offset);
}
