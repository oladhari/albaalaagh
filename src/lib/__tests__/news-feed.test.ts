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
