import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "X-Frame-Options",         value: "SAMEORIGIN" },
  { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control",  value: "on" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: media.albaalaagh.com",
      "connect-src 'self' https://api.stripe.com https://vtsadbazsctspncausha.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://player.twitch.tv https://embed.twitch.tv",
      "media-src 'self' https://media.albaalaagh.com blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // News articles written by البلاغ are served at /taqrir/[slug].
      // Old URLs (before the url field was corrected) pointed to /news/[slug].
      { source: "/news/:slug", destination: "/taqrir/:slug", permanent: true },
      // Known broken URLs found via Google Search Console — redirect to homepage
      { source: "/%D9%82%D9%88%D8%A7%D8%B9%D8%AF-%D8%A7%D9%84%D8%AA%D8%B9%D8%A7%D9%85%D9%84-%D9%85%D8%B9-%D8%A7%D9%84%D9%85%D8%AE%D8%A7%D9%84%D9%81", destination: "/", permanent: true },
      { source: "/%D9%82%D9%88%D8%A7%D8%B9%D8%AF-%D8%A7%D9%84%D8%AA%D8%B9%D8%A7%D9%85%D9%84-%D9%85%D8%B9-%D8%A7%D9%84%D9%85%D8%AE%D8%A7%D9%84%D9%81/", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
