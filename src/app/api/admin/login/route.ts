import { NextRequest, NextResponse } from "next/server";

// Per-instance rate limiting (best-effort on serverless — limits attacks on warm instances)
const attempts = new Map<string, { count: number; lockedUntil: number }>();
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

  const { password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    // Increment failure counter
    const current = rec && rec.lockedUntil <= now ? rec : { count: 0, lockedUntil: 0 };
    const newCount = current.count + 1;
    attempts.set(ip, {
      count:       newCount,
      lockedUntil: newCount >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
    });

    // Clear stale entries periodically to prevent memory leak
    if (attempts.size > 500) {
      for (const [k, v] of attempts) {
        if (v.lockedUntil < now - WINDOW_MS) attempts.delete(k);
      }
    }

    // Constant-time-ish delay to slow automated attempts
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  // Success — clear any failed attempts for this IP
  attempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_authed", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return res;
}
