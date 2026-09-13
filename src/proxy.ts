import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function createCspHeader(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${isDev ? " http: 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https: media.albaalaagh.com",
    [
      "connect-src 'self'",
      "https://api.stripe.com",
      "https://vtsadbazsctspncausha.supabase.co",
      "https://*.r2.cloudflarestorage.com",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://*.google-analytics.com",
      "https://pagead2.googlesyndication.com",
      "https://googleads.g.doubleclick.net",
    ].join(" "),
    [
      "frame-src 'self'",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://player.twitch.tv",
      "https://embed.twitch.tv",
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
      "https://googleads.g.doubleclick.net",
      "https://tpc.googlesyndication.com",
    ].join(" "),
    "media-src 'self' https://media.albaalaagh.com blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function createResponse(req: NextRequest, requestHeaders: Headers, cspHeader: string) {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export async function proxy(req: NextRequest) {
  const nonce = createNonce();
  const cspHeader = createCspHeader(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  let response = createResponse(req, requestHeaders, cspHeader);

  const isWriterRoute = req.nextUrl.pathname.startsWith("/writer");
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  if (isWriterRoute) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
            response = createResponse(req, requestHeaders, cspHeader);
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Protect /writer routes (except login)
    if (req.nextUrl.pathname !== "/writer/login" && !user) {
      const redirect = NextResponse.redirect(new URL("/writer/login", req.url));
      redirect.headers.set("Content-Security-Policy", cspHeader);
      return redirect;
    }

    // Redirect logged-in writers away from login page
    if (req.nextUrl.pathname === "/writer/login" && user) {
      const redirect = NextResponse.redirect(new URL("/writer", req.url));
      redirect.headers.set("Content-Security-Policy", cspHeader);
      return redirect;
    }
  }

  // Protect /admin routes (except /admin/login)
  const isAdminLogin = req.nextUrl.pathname === "/admin/login";
  const isAdminAuthed = req.cookies.get("admin_authed")?.value === "1";

  if (isAdminRoute && !isAdminLogin && !isAdminAuthed) {
    const redirect = NextResponse.redirect(new URL("/admin/login", req.url));
    redirect.headers.set("Content-Security-Policy", cspHeader);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.ico|robots.txt|sitemap.xml|feed.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
