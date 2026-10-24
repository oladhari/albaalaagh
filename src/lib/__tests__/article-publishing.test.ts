import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ queue: [] as Array<{ data: unknown; error: unknown }>, callbacks: [] as Array<() => Promise<void>>, share: vi.fn(), updates: [] as unknown[], equalities: [] as unknown[] }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn(async () => null) }));
vi.mock("@/lib/share", () => ({ shareToAll: mocks.share }));
vi.mock("next/server", async importOriginal => ({ ...await importOriginal<typeof import("next/server")>(), after: (cb: () => Promise<void>) => mocks.callbacks.push(cb) }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: () => {
  const chain = { select: () => chain, eq: (...args: unknown[]) => { mocks.equalities.push(args); return chain; }, insert: (data: unknown) => { mocks.updates.push(data); return chain; }, update: (data: unknown) => { mocks.updates.push(data); return chain; }, single: async () => mocks.queue.shift() };
  return chain;
} } }));
import { POST } from "@/app/api/admin/articles/route";
import { PATCH } from "@/app/api/admin/articles/[id]/route";
const row = { id: "c8306fdb-205c-42a6-b071-ce859edcbaac", title: "تقرير", content: "<p>مادة التقرير</p>", excerpt: "ملخص", slug: "old-slug", category: "تقارير", cover_image: "https://media.albaalaagh.com/cover.jpg", writer: null, published: true, status: "published", published_at: "2026-10-23T00:00:00Z" };
const req = (body: unknown, method = "POST") => new NextRequest("http://localhost/api/admin/articles", { method, body: JSON.stringify(body) });
const result = (data: unknown) => ({ data, error: null });
beforeEach(() => { mocks.queue.length = 0; mocks.callbacks.length = 0; mocks.updates.length = 0; mocks.equalities.length = 0; mocks.share.mockReset().mockResolvedValue(undefined); });
describe("publication dispatch boundaries", () => {
  it("dispatches a new report's cover and canonical URL after publication", async () => {
    mocks.queue.push(result(row));
    expect((await POST(req({ ...row, writer_id: null }))).status).toBe(201);
    expect(mocks.share).not.toHaveBeenCalled();
    await mocks.callbacks[0]();
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({ type: "report", slug: row.id.replaceAll("-", ""), facebook_image: row.cover_image, image: row.cover_image }));
  });
  it("dispatches programme articles through the publication transition using their main cover", async () => {
    const programme = { ...row, category: "من برامجنا", slug: "schoolTime202610" };
    mocks.queue.push(result({ ...programme, published: false, status: "draft" }), result(programme));
    await PATCH(req({ status: "published", published: true }, "PATCH"), { params: Promise.resolve({ id: row.id }) });
    await mocks.callbacks[0]();
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({ type: "programme", slug: "schoolTime202610", image: row.cover_image, facebook_image: row.cover_image }));
  });
  it("never shares draft creation or published-content edits", async () => {
    mocks.queue.push(result({ ...row, published: false, status: "draft" }));
    await POST(req({ ...row, published: false, writer_id: null }));
    mocks.queue.push(result(row), result({ ...row, title: "تحرير" }));
    await PATCH(req({ title: "تحرير" }, "PATCH"), { params: Promise.resolve({ id: row.id }) });
    expect(mocks.callbacks).toHaveLength(0);
  });
  it("publishes an existing draft once and guards the previous visibility state", async () => {
    mocks.queue.push(result({ ...row, published: false, status: "draft", published_at: null }), result(row));
    await PATCH(req({ status: "published", published: true }, "PATCH"), { params: Promise.resolve({ id: row.id }) });
    expect(mocks.callbacks).toHaveLength(1);
    expect(mocks.equalities).toContainEqual(["status", "draft"]);
    expect(mocks.equalities).toContainEqual(["published", false]);
    await mocks.callbacks[0]();
    expect(mocks.share).toHaveBeenCalledOnce();
  });
  it("unpublishes both visibility fields and does not dispatch a failed concurrent update", async () => {
    mocks.queue.push(result(row), result({ ...row, published: false, status: "draft" }));
    await PATCH(req({ status: "draft" }, "PATCH"), { params: Promise.resolve({ id: row.id }) });
    expect(mocks.updates[0]).toMatchObject({ status: "draft", published: false, published_at: null });
    mocks.queue.push(result({ ...row, status: "draft", published: false }), { data: null, error: { code: "PGRST116" } });
    const r = await PATCH(req({ status: "published", published: true }, "PATCH"), { params: Promise.resolve({ id: row.id }) });
    expect(r.status).toBe(409);
    expect(mocks.callbacks).toHaveLength(0);
  });
});
