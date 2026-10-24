import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: false, row: null as Record<string, unknown> | null, eq: [] as unknown[], categories: [] as unknown[] }));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.admin ? { value: "1" } : undefined }) }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: () => {
  const chain = { select: () => chain, in: (...args: unknown[]) => { mocks.categories.push(args); return chain; }, eq: (...args: unknown[]) => { mocks.eq.push(args); return chain; }, single: async () => ({ data: mocks.row, error: null }) }; return chain;
} } }));
import { generateMetadata } from "@/app/(site)/from-programmes/[slug]/page";
const row = { id: "c8306fdb-205c-42a6-b071-ce859edcbaac", slug: "schoolTime202610", title: "التوقيت المدرسي", excerpt: "قراءة في الحلقة", cover_image: "https://media.albaalaagh.com/episode.jpg", published_at: "2026-10-24T07:00:00Z" };
const props = (preview?: string) => ({ params: Promise.resolve({ slug: row.slug }), searchParams: Promise.resolve({ preview }) });
beforeEach(() => { mocks.row = null; mocks.admin = false; mocks.eq.length = 0; mocks.categories.length = 0; });
describe("programme article access and metadata", () => {
  it("requires both publication fields for anonymous visitors even when preview is requested", async () => {
    const metadata = await generateMetadata(props("1"));
    expect(mocks.eq).toContainEqual(["published", true]);
    expect(mocks.eq).toContainEqual(["status", "published"]);
    expect(mocks.categories).toContainEqual(["category", ["من برامجنا"]]);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
  it("marks authenticated draft previews noindex and omits public sharing metadata", async () => {
    mocks.admin = true; mocks.row = row;
    const metadata = await generateMetadata(props("1"));
    expect(mocks.eq).not.toContainEqual(["published", true]);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toEqual({ images: [] });
    expect(metadata.alternates).toBeUndefined();
  });
  it("uses the article date, main cover and dedicated canonical URL for published material", async () => {
    mocks.row = row;
    const metadata = await generateMetadata(props());
    expect(metadata.alternates).toEqual({ canonical: "https://www.albaalaagh.com/from-programmes/schoolTime202610" });
    expect(metadata.openGraph).toMatchObject({ type: "article", publishedTime: row.published_at, images: [{ url: row.cover_image, width: 1280, height: 720, alt: row.title }] });
  });
});
