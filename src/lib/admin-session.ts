import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
const MAX_AGE = 7 * 24 * 60 * 60;
export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

function signingKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 43 ? secret : null;
}

function sign(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("base64url");
}

export function createAdminSession(): string | null {
  const key = signingKey();
  if (!key) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = `v1.${expiresAt}.${randomBytes(16).toString("base64url")}`;
  return `${value}.${sign(value, key)}`;
}

export function isValidAdminSession(cookie: string | undefined): boolean {
  const key = signingKey();
  if (!key || !cookie) return false;
  const match = /^(v1\.(\d{10})\.[A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(cookie);
  if (!match) return false;
  const [, value, expiresAt, signature] = match;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(sign(value, key)));
}
