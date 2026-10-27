import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const m = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), insert: vi.fn(),
  guest: vi.fn(), matches: vi.fn(), created: vi.fn(), concurrent: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: m.auth }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: m.from } }));
import { GET, POST } from "@/app/api/admin/writers/from-guest/route";

const profile = { id: "14f089c4-b9f4-4a7b-9f27-7eea5d367d16", name: "ماهر المذيوب",
  title: "نائب سابق", bio: "نبذة الضيف", image_url: "https://example.com/original.jpg" };
const req = (body: unknown) => new NextRequest("http://localhost/api/admin/writers/from-guest", {
  method: "POST", body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks(); m.auth.mockResolvedValue(null);
  m.guest.mockResolvedValue({ data: profile, error: null });
  m.matches.mockResolvedValue({ data: [], error: null });
  m.created.mockResolvedValue({ data: profile, error: null });
  m.concurrent.mockResolvedValue({ data: profile, error: null });
  m.from.mockImplementation((table: string) => {
    const q = { select: () => q, eq: () => q, order: m.guest,
      maybeSingle: table === "guests" ? m.guest : m.concurrent,
      ilike: m.matches, single: m.created, insert: (v: unknown) => { m.insert(v); return q; } };
    return q;
  });
});
describe("adding a guest as a writer", () => {
  it("requires admin authentication for reads and writes", async () => {
    m.auth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await GET()).status).toBe(401);
    expect((await POST(req({ guest_id: profile.id }))).status).toBe(401);
    expect(m.from).not.toHaveBeenCalled();
  });
  it("copies the stored profile, ignoring client-submitted identity or login fields", async () => {
    const result = await POST(req({ guest_id: profile.id, name: "بديل", user_id: "login", role: "admin" }));
    expect(result.status).toBe(201);
    expect(m.insert).toHaveBeenCalledWith(profile);
    expect((await result.json()).writer.image_url).toBe(profile.image_url);
    expect(m.from.mock.calls.map(([table]) => table)).toEqual(["guests", "writers", "writers"]);
  });
  it("reuses an existing writer without overwriting their profile", async () => {
    const existing = { ...profile, id: "existing", bio: "نبذة محررة" };
    m.matches.mockResolvedValue({ data: [existing], error: null });
    const result = await POST(req({ guest_id: profile.id }));
    expect(await result.json()).toEqual({ writer: existing, existing: true });
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("resolves concurrent imports using the deterministic primary key", async () => {
    m.created.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await (await POST(req({ guest_id: profile.id }))).json()).toEqual({ writer: profile, existing: true });
  });
  it("rejects ambiguous writers, missing guests and malformed input without insertion", async () => {
    expect((await POST(req({ guest_id: "bad" }))).status).toBe(400);
    m.guest.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(req({ guest_id: profile.id }))).status).toBe(404);
    m.matches.mockResolvedValue({ data: [profile, profile], error: null });
    expect((await POST(req({ guest_id: profile.id }))).status).toBe(409);
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("stops when source lookup fails or its required fields are incomplete", async () => {
    m.guest.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
    expect((await POST(req({ guest_id: profile.id }))).status).toBe(500);
    m.guest.mockResolvedValueOnce({ data: { ...profile, title: " " }, error: null });
    expect((await POST(req({ guest_id: profile.id }))).status).toBe(400);
    expect(m.insert).not.toHaveBeenCalled();
  });
});
