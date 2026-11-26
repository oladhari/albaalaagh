import type { ArticleChartData } from "@/lib/article-chart";

const escape = (value: string) => value.replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const exact = new Intl.NumberFormat("en", { maximumFractionDigits: 8 });
const compact = new Intl.NumberFormat("en", { maximumFractionDigits: 4 });
const percentage = new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function axisCeiling(maximum: number) {
  if (maximum === 0) return 4;
  const base = 10 ** Math.floor(Math.log10(maximum / 4));
  const step = [1, 2, 2.5, 3, 5, 10].find((value) => value * base * 4 >= maximum) ?? 10;
  return step * base * 4;
}

function estimateNote(chart: ArticleChartData) {
  const estimated = chart.periods.filter((period) => period.estimated);
  if (!estimated.length) return "";
  const periods = estimated.map((period) => escape(period.label)).join("، ");
  return `<span class="article-chart__estimate"><bdi dir="ltr">*</bdi> ${periods} — ${escape(chart.estimateLabel ?? "تقديرات")}</span>`;
}

export function renderChartTable(chart: ArticleChartData) {
  const isPercent = chart.type === "stacked-percent";
  const unit = isPercent ? "%" : chart.unit;
  const headings = chart.series.map((series) => `<th scope="col">${escape(series.label)}</th>`).join("");
  const rows = chart.periods.map((period, index) => {
    const values = chart.series.map((series) => {
      const value = series.values[index];
      const text = isPercent ? `${percentage.format(value)}%` : exact.format(value);
      return `<td><bdi dir="ltr">${text}</bdi></td>`;
    }).join("");
    return `<tr><th scope="row"><bdi dir="ltr">${escape(period.label)}${period.estimated ? "*" : ""}</bdi></th>${values}</tr>`;
  }).join("");
  return `<table><caption>${escape(chart.title)}${unit ? ` (${escape(unit)})` : ""}</caption>
<thead><tr><th scope="col">السنة / الفترة</th>${headings}</tr></thead><tbody>${rows}</tbody></table>`;
}

function chartPlot(chart: ArticleChartData) {
  const stacked = chart.type === "stacked-percent";
  const peak = stacked ? 100 : chart.axisMax ?? axisCeiling(Math.max(...chart.series.flatMap((series) => series.values)));
  const top = 35, bottom = 254, left = 15, right = 475;
  const band = (right - left) / chart.periods.length;
  const bar = Math.min(64, band * 0.68 / (chart.type === "grouped" ? chart.series.length : 1));
  const y = (value: number) => bottom - (bottom - top) * value / peak;
  const position = (value: number) => value.toFixed(3);
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = peak * index / 4;
    const row = position(y(value));
    return `<line class="article-chart__grid${index === 0 ? " article-chart__grid--base" : ""}" x1="${left}" x2="${right}" y1="${row}" y2="${row}"/>
<text class="article-chart__axis" x="${right + 11}" y="${row}" dominant-baseline="central">${exact.format(value)}${stacked ? "%" : ""}</text>`;
  }).join("");

  const columns = chart.periods.map((period, index) => {
    const center = right - band * (index + 0.5);
    const sum = stacked ? chart.series.reduce((total, series) => total + series.values[index], 0) : 0;
    let accumulated = 0;
    const bars = chart.series.map((series, seriesIndex) => {
      const value = series.values[index];
      const heightValue = stacked ? value * 100 / sum : value;
      const barTop = y(accumulated + heightValue);
      const barHeight = y(accumulated) - barTop;
      const offset = chart.type === "grouped" ? (chart.series.length / 2 - 1 - seriesIndex) * (bar + 2) + 1 : -bar / 2;
      const x = center + offset;
      if (stacked) accumulated += heightValue;
      const estimated = period.estimated ? " article-chart__bar--estimate" : "";
      const rect = `<rect class="article-chart__bar article-chart__bar--${series.color}${estimated}" x="${position(x)}" y="${position(barTop)}" width="${position(bar)}" height="${position(barHeight)}" />`;
      if (stacked && barHeight >= 20) {
        return `${rect}<text class="article-chart__inside" x="${position(center)}" y="${position(barTop + barHeight / 2)}" text-anchor="middle" dominant-baseline="central">${percentage.format(value)}%</text>`;
      }
      if (chart.type === "bar") {
        return `${rect}<text class="article-chart__value" x="${position(center)}" y="${position(barTop - 10)}" text-anchor="middle">${compact.format(value)}</text>`;
      }
      return rect;
    }).join("");
    return `${bars}<text class="article-chart__year" x="${position(center)}" y="282" text-anchor="middle">${escape(period.label)}${period.estimated ? "*" : ""}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" class="article-chart__plot" viewBox="0 0 540 296" aria-hidden="true" focusable="false" direction="ltr">${ticks}${columns}</svg>`;
}

export function ArticleChart(chart: ArticleChartData): string {
  const unit = chart.type === "stacked-percent" ? "النسبة من إجمالي الدين (%)" : chart.unit;
  const legend = chart.series.length > 1 ? `<ul class="article-chart__legend">${chart.series.map((series) =>
    `<li><span class="article-chart__swatch article-chart__bar--${series.color}" aria-hidden="true"></span>${escape(series.label)}</li>`).join("")}</ul>` : "";
  const sources = chart.sources.map(({ label, url }) => `<a href="${escape(url)}">${escape(label)}</a>`).join(" · ");
  return `<figure class="article-chart" dir="rtl" lang="ar" aria-label="${escape(chart.title)}">
<div class="article-chart__heading">
<strong class="article-chart__title">${escape(chart.title)}</strong>
${unit ? `<span class="article-chart__unit">${escape(unit)}</span>` : ""}
</div>
${legend}
${chartPlot(chart)}
${estimateNote(chart)}
<details class="article-chart__details">
<summary>عرض جدول البيانات</summary>
<div class="article-chart__table" role="region" aria-label="جدول البيانات" tabindex="0">${renderChartTable(chart)}</div>
</details>
<figcaption class="article-chart__caption">${escape(chart.caption)}
<span class="article-chart__source">المصدر: ${sources}</span></figcaption>
</figure>`;
}
