import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions, createAdminSession } from "@/lib/admin-session";

// Per-instance rate limiting (best-effort on serverless — limits attacks on warm instances)
const attempts = new Map<string, { count: number; lastFailureAt: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 15 * 60 * 1000; // 15 min lockout after 5 failures
const WINDOW_MS    = 15 * 60 * 1000; // reset counter after 15 min of no failures

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const now = Date.now();
  const rec = attempts.get(ip);

  // Check lockout
  if (rec && rec.lockedUntil > now) {
    const remaining = Math.ceil((rec.lockedUntil - now) / 1000 / 60);
    return NextResponse.json(
      { error: `تم تجاوز عدد المحاولات. حاول مجدداً بعد ${remaining} دقيقة.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json({ error: "خدمة تسجيل الدخول غير متاحة" }, { status: 503 });
  }

  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (typeof password !== "string" || !timingSafeEqual(digest(password), digest(expectedPassword))) {
    // Increment failure counter
    const newCount = rec && !rec.lockedUntil && now - rec.lastFailureAt < WINDOW_MS ? rec.count + 1 : 1;
    attempts.set(ip, {
      count:       newCount,
      lastFailureAt: now,
      lockedUntil: newCount >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
    });

    // Clear stale entries periodically to prevent memory leak
    if (attempts.size > 500) {
      for (const [k, v] of attempts) {
        if (v.lockedUntil <= now && v.lastFailureAt <= now - WINDOW_MS) attempts.delete(k);
      }
    }

    // Constant-time-ish delay to slow automated attempts
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const session = createAdminSession();
  if (!session) {
    return NextResponse.json({ error: "خدمة تسجيل الدخول غير متاحة" }, { status: 503 });
  }
  attempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, session, adminSessionCookieOptions);

  return res;
}
