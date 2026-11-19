import { expect, it, vi } from "vitest";
import TaqrirPage, { generateMetadata } from "@/app/(site)/taqrir/[slug]/page";

const reports = vi.hoisted(() => [
  { id: "8d37ccf6-be7f-4e2f-8a7e-6cc0a21b8342", slug: "pending-report", status: "pending", title: "Pending title" },
  { id: "d53e0902-1fab-4c34-9fd1-b7de3dd767bb", slug: "former-report", status: "rejected", title: "Rejected title" },
  { id: "686f0efd-9d5d-4eaf-850d-7a0ca5f4af99", slug: "published-report", status: "approved", title: "Published title" },
].map((report) => ({ ...report, source: "البلاغ" })));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); } }));
vi.mock("@/lib/supabase", () => ({
  supabase: { from: () => {
    let rows = reports;
    const query = {
      select: () => query,
      eq: (field: "source" | "status" | "slug", value: string) => {
        rows = rows.filter((report) => report[field] === value);
        return query;
      },
      or: (filter: string) => {
        const id = filter.split(",")[0].slice("id.eq.".length);
        rows = rows.filter((report) => report.id === id);
        return query;
      },
      like: (_field: string, prefix: string) => {
        rows = rows.filter((report) => report.slug.startsWith(prefix.slice(0, -1)));
        return query;
      },
      single: async () => ({ data: rows.length === 1 ? rows[0] : null }),
      limit: async (n: number) => ({ data: rows.slice(0, n) }),
    };
    return query;
  } },
}));

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

it.each(reports.slice(0, 2))("hides $status reports from the page and metadata by slug, ID and legacy prefix", async (report) => {
  for (const slug of [report.slug, report.id, report.id.replaceAll("-", ""), report.slug.split("-")[0] + "-"]) {
    expect(await generateMetadata(props(slug))).toEqual({});
    await expect(TaqrirPage(props(slug))).rejects.toThrow("404");
  }
});

it("still exposes metadata for approved reports through canonical and legacy lookups", async () => {
  const report = reports[2];
  for (const slug of [report.slug, report.id.replaceAll("-", ""), "published-"]) {
    expect(await generateMetadata(props(slug))).toMatchObject({ title: "Published title | البلاغ" });
  }
});
