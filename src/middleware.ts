import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /writer routes (except login)
  if (req.nextUrl.pathname.startsWith("/writer") &&
      req.nextUrl.pathname !== "/writer/login" &&
      !user) {
    return NextResponse.redirect(new URL("/writer/login", req.url));
  }

  // Redirect logged-in writers away from login page
  if (req.nextUrl.pathname === "/writer/login" && user) {
    return NextResponse.redirect(new URL("/writer", req.url));
  }

  // Protect /admin routes (except /admin/login)
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isAdminLogin = req.nextUrl.pathname === "/admin/login";
  const isAdminAuthed = req.cookies.get("admin_authed")?.value === "1";
  const isDev = process.env.NODE_ENV === "development";

  if (isAdminRoute && !isAdminLogin && !isAdminAuthed && !isDev) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/writer/:path*", "/admin/:path*"],
};
