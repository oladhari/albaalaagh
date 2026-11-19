import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_COOKIE, createAdminSession, isValidAdminSession } from "@/lib/admin-session";
import { requireAdmin } from "@/lib/admin-auth";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { proxy } from "@/proxy";

const cookies = vi.hoisted(() => new Map<string, { value: string }>());
vi.mock("next/headers", () => ({ cookies: async () => cookies }));

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", randomBytes(32).toString("hex"));
  vi.stubEnv("ADMIN_PASSWORD", "test-only-admin-password");
  cookies.clear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("admin session boundaries", () => {
  it("accepts a server-issued login token and expires the cookie on logout", async () => {
    const response = await login(new NextRequest("https://albaalaagh.test/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
    }));
    expect(response.status).toBe(200);
    const session = response.cookies.get(ADMIN_SESSION_COOKIE)!;
    expect(session).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    cookies.set(session.name, { value: session.value });
    expect(await requireAdmin()).toBeNull();
    const page = await proxy(new NextRequest("https://albaalaagh.test/admin", {
      headers: { cookie: `${session.name}=${session.value}` },
    }));
    expect(page.headers.get("location")).toBeNull();
    expect((await logout()).cookies.get(ADMIN_SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("rejects legacy cookies in the API and on admin page requests", async () => {
    cookies.set("admin_authed", { value: "1" });
    expect((await requireAdmin())?.status).toBe(401);
    const page = await proxy(new NextRequest("https://albaalaagh.test/admin", {
      headers: { cookie: "admin_authed=1", "next-router-prefetch": "1" },
    }));
    expect(page.headers.get("location")).toBe("https://albaalaagh.test/admin/login");
  });

  it("rejects modified tokens, expired tokens and tokens from another signing key", () => {
    vi.useFakeTimers();
    const session = createAdminSession()!;
    const last = session.endsWith("x") ? "y" : "x";
    expect(isValidAdminSession(session.slice(0, -1) + last)).toBe(false);
    expect(isValidAdminSession("1")).toBe(false);
    vi.setSystemTime(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(isValidAdminSession(session)).toBe(false);
    const recent = createAdminSession()!;
    vi.stubEnv("ADMIN_SESSION_SECRET", randomBytes(32).toString("hex"));
    expect(isValidAdminSession(recent)).toBe(false);
  });

  it("fails closed without a configured password or signing secret", async () => {
    vi.stubEnv("ADMIN_PASSWORD", undefined);
    const request = (body: object) => new NextRequest("https://albaalaagh.test/api/admin/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect((await login(request({}))).status).toBe(503);
    vi.stubEnv("ADMIN_PASSWORD", "test-only-admin-password");
    vi.stubEnv("ADMIN_SESSION_SECRET", undefined);
    expect((await login(request({ password: process.env.ADMIN_PASSWORD }))).status).toBe(503);
    expect(createAdminSession()).toBeNull();
  });
});
