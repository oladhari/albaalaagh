import { describe, expect, it } from "vitest";
import {
  isFreshNewsDate,
  newsFreshnessCutoff,
  sortNewsSuggestions,
} from "@/lib/news-feed";

describe("news freshness", () => {
  const now = Date.parse("2026-09-22T12:00:00.000Z");

  it("keeps news inside 24 hours and rejects older or undated items", () => {
    expect(isFreshNewsDate("2026-09-21T12:00:01.000Z", now)).toBe(true);
    expect(isFreshNewsDate("2026-09-21T11:59:59.000Z", now)).toBe(false);
    expect(isFreshNewsDate(undefined, now)).toBe(false);
    expect(isFreshNewsDate("not-a-date", now)).toBe(false);
  });

  it("builds the exact 24-hour database cutoff", () => {
    expect(newsFreshnessCutoff(now)).toBe("2026-09-21T12:00:00.000Z");
  });
});

describe("news suggestion ordering", () => {
  it("orders Tunisia, Arab, international, then technology before score", () => {
    const items = [
      { title: "tech", source_topic: "technology", priority_score: 10, published_at: "2026-09-22T11:00:00Z" },
      { title: "world", source_topic: "international", priority_score: 10, published_at: "2026-09-22T11:00:00Z" },
      { title: "arab", source_topic: "arab", priority_score: 10, published_at: "2026-09-22T11:00:00Z" },
      { title: "tunisia", source_topic: "tunisia", priority_score: 0, published_at: "2026-09-22T10:00:00Z" },
    ];

    expect(sortNewsSuggestions(items).map((item) => item.title)).toEqual([
      "tunisia",
      "arab",
      "world",
      "tech",
    ]);
  });

  it("uses editorial score and recency inside the same topic", () => {
    const items = [
      { title: "new", source_topic: "tunisia", priority_score: 2, published_at: "2026-09-22T11:00:00Z" },
      { title: "urgent", source_topic: "tunisia", priority_score: 8, published_at: "2026-09-22T09:00:00Z" },
    ];

    expect(sortNewsSuggestions(items).map((item) => item.title)).toEqual([
      "urgent",
      "new",
    ]);
  });
});

describe("important-news shortlist", () => {
  it("prioritises major events over routine items and re-scores old pending rows", async () => {
    const { selectImportantNews, suggestionPriority } = await import("../news-feed");
    const items = [
      { title: "افتتاح دورة تدريبية في قبلي", source_topic: "tunisia", priority_score: 0 },
      { title: "فيضانات واسعة وإعلان حالة الطوارئ في تونس", source_topic: "tunisia", priority_score: 0 },
      { title: "وقف إطلاق النار بعد غارات وقصف عنيف", source_topic: "international", priority_score: 0 },
      { title: "New startup funding round", source_topic: "technology", source: "TechCrunch", priority_score: 0 },
    ];
    expect(suggestionPriority(items[2])).toBeGreaterThanOrEqual(8);
    expect(selectImportantNews(items).map((item) => item.title)).toEqual([items[1].title, items[2].title, items[3].title]);
  });

  it("limits each region separately, preserves all tech choices, and keeps the full input intact", async () => {
    const { selectImportantNews } = await import("../news-feed");
    const items: { title: string; source_topic: string; priority_score: number; source?: string }[] = [
      ...Array.from({ length: 16 }, (_, i) => ({ title: `خبر تونسي مهم ${i}`, source_topic: "tunisia", priority_score: 8 })),
      ...Array.from({ length: 17 }, (_, i) => ({ title: `World event ${i}`, source_topic: "international", priority_score: 9 })),
      ...["TechCrunch", "BBC Technology", "NASA"].map((source) => ({ title: source, source, source_topic: "technology", priority_score: 0 })),
    ];
    const result = selectImportantNews(items);
    expect(result.filter((item) => item.source_topic === "tunisia")).toHaveLength(12);
    expect(result.filter((item) => item.source_topic === "international")).toHaveLength(12);
    expect(result.filter((item) => item.source_topic === "technology").map((item) => item.source)).toEqual(["BBC Technology", "TechCrunch", "NASA"]);
    expect(items).toHaveLength(36);
  });

  it("collapses equivalent cross-source headlines without merging different casualty counts", async () => {
    const { selectImportantNews } = await import("../news-feed");
    const items = [
      { title: "غارات واسعة على مدينة غزة ومقتل 20 شخصا", priority_score: 9 },
      { title: "عاجل: غارات واسعة على مدينة غزة ومقتل 20 شخصا", priority_score: 9 },
      { title: "غارات واسعة على مدينة غزة ومقتل 50 شخصا", priority_score: 9 },
    ];
    expect(selectImportantNews(items)).toHaveLength(2);
  });
});


it("surfaces significant USGS events and excludes GDACS green alerts from important news", async () => {
  const { selectImportantNews } = await import("../news-feed");
  const items = [
    { title: "Green forest fire notification", source: "GDACS", source_topic: "disaster", priority_score: 8 },
    { title: "M 6.4 - Example region", source: "USGS", source_topic: "disaster", priority_score: 0 },
    { title: "US approves sale of 500 Patriot missiles to Ukraine", source: "BBC World", source_topic: "international", priority_score: 0 },
  ];
  expect(selectImportantNews(items).map((item) => item.source)).toEqual(["BBC World", "USGS"]);
});


it("does not treat every Mosaïque international headline as Tunisian news", async () => {
  const { resolveNewsGeo } = await import("../news-feed");
  expect(resolveNewsGeo({ title: "فرنسا تعلن إجراءات أمنية جديدة", source_topic: "tunisia", geo: "tunisia" })).toBe("international");
  expect(resolveNewsGeo({ title: "الهند تجلي الآلاف استعدادا لثاني إعصار في أسبوع", source_topic: "tunisia", geo: "tunisia" })).toBe("international");
  expect(resolveNewsGeo({ title: "الاحتجاجات تصل سويسرا", source_topic: "tunisia", geo: "tunisia" })).toBe("international");
  expect(resolveNewsGeo({ title: "إيطاليا: وصول عمال بناء تونسيين", source_topic: "tunisia" })).toBe("tunisia");
});


it("keeps routine local crime and historical war features out of the important view", async () => {
  const { selectImportantNews } = await import("../news-feed");
  expect(selectImportantNews([
    { title: "بطاقة إيداع بالسجن في حق متسوّل", source_topic: "tunisia" },
    { title: "لورنس العرب", excerpt: "قصة من الحرب العالمية الأولى", source_topic: "arab" },
  ])).toHaveLength(0);
});


it("does not crowd out a larger global event with a full regional feed", async () => {
  const { selectImportantNews } = await import("../news-feed");
  const items = [
    ...Array.from({ length: 15 }, (_, i) => ({ title: `Regional story ${i}`, source_topic: "arab", priority_score: 8 })),
    { title: "Major global event", source_topic: "international", priority_score: 10 },
  ];
  const selected = selectImportantNews(items);
  expect(selected).toHaveLength(12);
  expect(selected.some((item) => item.title === "Major global event")).toBe(true);
});
