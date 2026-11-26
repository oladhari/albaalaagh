const COLORS = ["gold", "domestic", "external", "equipment", "investment"] as const;
type ChartColor = typeof COLORS[number];

export type ArticleChartData = {
  type: "bar" | "grouped" | "stacked-percent";
  title: string;
  caption: string;
  unit?: string;
  estimateLabel?: string;
  periods: { label: string; estimated?: boolean }[];
  series: { label: string; color: ChartColor; values: number[] }[];
  sources: { label: string; url: string }[];
  axisMax?: number;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function label(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

function sourceUrl(value: unknown): value is string {
  if (!label(value, 500)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseArticleChart(json: string): ArticleChartData | null {
  if (json.length > 12_000) return null;
  let chart: unknown;
  try {
    chart = JSON.parse(json);
  } catch {
    return null;
  }
  if (!record(chart)) return null;
  const { type, title, caption, unit, estimateLabel, periods, series, sources, axisMax } = chart;
  if (type !== "bar" && type !== "grouped" && type !== "stacked-percent") return null;
  if (!label(title, 120) || !label(caption, 900)) return null;
  if (unit !== undefined && !label(unit, 48)) return null;
  if (estimateLabel !== undefined && !label(estimateLabel, 100)) return null;
  if (!Array.isArray(periods) || !Array.isArray(series) || !Array.isArray(sources)) return null;
  if (periods.length < 1 || periods.length > 8 || sources.length < 1 || sources.length > 3) return null;
  if (type === "bar" ? series.length !== 1 : series.length < 2 || series.length > 4) return null;

  const cleanPeriods: ArticleChartData["periods"] = [];
  for (const period of periods) {
    if (!record(period) || !label(period.label, 10)) return null;
    if (period.estimated !== undefined && typeof period.estimated !== "boolean") return null;
    cleanPeriods.push({ label: period.label, estimated: period.estimated });
  }
  if (new Set(cleanPeriods.map((period) => period.label)).size !== periods.length) return null;

  const cleanSeries: ArticleChartData["series"] = [];
  for (const entry of series) {
    if (!record(entry) || !label(entry.label, 100) || !Array.isArray(entry.values)) return null;
    const color = COLORS.find((candidate) => candidate === entry.color);
    if (!color || entry.values.length !== periods.length) return null;
    const values: number[] = [];
    for (const value of entry.values) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e9) return null;
      values.push(value);
    }
    cleanSeries.push({ label: entry.label, color, values });
  }
  const maximum = Math.max(...cleanSeries.flatMap((entry) => entry.values));
  if (type === "stacked-percent") {
    if (axisMax !== undefined || maximum > 100) return null;
    for (let i = 0; i < periods.length; i++) {
      const total = cleanSeries.reduce((sum, entry) => sum + entry.values[i], 0);
      if (Math.abs(total - 100) > 0.11) return null;
    }
  } else if (axisMax !== undefined && (typeof axisMax !== "number" ||
      !Number.isFinite(axisMax) || axisMax <= 0 || axisMax < maximum || axisMax > 1e9)) {
    return null;
  }

  const cleanSources: ArticleChartData["sources"] = [];
  for (const source of sources) {
    if (!record(source) || !label(source.label, 130) || !sourceUrl(source.url)) return null;
    cleanSources.push({ label: source.label, url: source.url });
  }

  return { type, title, caption, unit, estimateLabel, axisMax,
    periods: cleanPeriods, series: cleanSeries, sources: cleanSources };
}
