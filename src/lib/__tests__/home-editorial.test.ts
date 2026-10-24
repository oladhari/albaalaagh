import { describe, expect, it, vi } from "vitest";
const rows = vi.hoisted(() => [
  ...Array.from({length: 5}, (_,i) => ({id: `report${i}`, category: i % 2 ? "تقارير فيديو" : "تقارير", status: "published", published: true, published_at: `2026-10-${20+i}`})),
  {id: "programme", category: "من برامجنا", status: "published", published: true, published_at: "2026-10-24"},
  {id: "essay", category: "سياسة", status: "published", published: true, published_at: "2026-10-23"},
  {id: "religion", category: "دين", status: "published", published: true, published_at: "2026-10-22"},
  {id: "draft", category: "من برامجنا", status: "draft", published: false, published_at: "2026-10-25"},
  {id: "hidden", category: "دين", status: "published", published: false, published_at: "2026-10-25"},
]);
vi.mock("../supabase", () => ({ supabaseAdmin: { from: () => {
  let result = [...rows];
  const chain = { select: () => chain, eq: (key: string, value: unknown) => { result = result.filter(r => r[key as keyof typeof r] === value); return chain; }, in: (_key: string, values: string[]) => { result = result.filter(r => values.includes(r.category)); return chain; }, not: (_key: string, _op: string, values: string) => { result = result.filter(r => !values.includes(`"${r.category}"`)); return chain; }, order: () => { result.sort((a,b) => b.published_at.localeCompare(a.published_at)); return chain; }, limit: async (n: number) => ({data: result.slice(0,n), error: null}) }; return chain;
} } }));
import { getHomeEditorialSections } from "../home-editorial";
describe("homepage editorial sections", () => {
  it("keeps four sections ordered, independently limited and disjoint, with only published content", async () => {
    const sections = await getHomeEditorialSections();
    expect(sections.map(s => s.href)).toEqual(["/reports", "/from-programmes", "/articles", "/qadaya-sharia"]);
    expect(sections.map(s => s.articles.map(a => a.id))).toEqual([["report4", "report3", "report2"], ["programme"], ["essay"], ["religion"]]);
  });
});
