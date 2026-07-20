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
      "connect-src 'self' https://api.stripe.com https://vtsadbazsctspncausha.supabase.co https://*.r2.cloudflarestorage.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://player.twitch.tv https://embed.twitch.tv https://www.youtube.com https://www.youtube-nocookie.com",
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

      // Old WordPress author pages → homepage
      { source: "/author/:name", destination: "/", permanent: true },

      // Dead /taqrir/ slugs from old CMS (short slugs, no longer in DB) → news listing
      { source: "/taqrir/mjls-", destination: "/news", permanent: true },
      { source: "/taqrir/alsltat-", destination: "/news", permanent: true },
      { source: "/taqrir/kwhyr-", destination: "/news", permanent: true },
      { source: "/taqrir/msdr-", destination: "/news", permanent: true },
      { source: "/taqrir/albnk-", destination: "/news", permanent: true },
      { source: "/taqrir/alahtlal-ykhttf", destination: "/news", permanent: true },
      { source: "/taqrir/ghzh-tnzf-", destination: "/news", permanent: true },
      { source: "/taqrir/twns-", destination: "/news", permanent: true },
      { source: "/taqrir/fryq-", destination: "/news", permanent: true },
      { source: "/taqrir/alkwyt-taln-", destination: "/news", permanent: true },
      { source: "/taqrir/tramb-ynshr-", destination: "/news", permanent: true },
      { source: "/taqrir/tramb-", destination: "/news", permanent: true },
      { source: "/taqrir/iyran-", destination: "/news", permanent: true },
      { source: "/taqrir/alnaeb-alsabq", destination: "/news", permanent: true },
      { source: "/taqrir/wzyr-altshghyl-", destination: "/news", permanent: true },
      { source: "/taqrir/astshhad-tbyb", destination: "/news", permanent: true },
      { source: "/taqrir/msyrh-", destination: "/news", permanent: true },
      { source: "/taqrir/tqaryr-", destination: "/news", permanent: true },
      { source: "/taqrir/alahtlal-yaln-", destination: "/news", permanent: true },
      { source: "/taqrir/mhtjwn-fy-", destination: "/news", permanent: true },
      { source: "/taqrir/wthyqh-", destination: "/news", permanent: true },
      { source: "/taqrir/mqtl-", destination: "/news", permanent: true },
      { source: "/taqrir/iyran-tualn-", destination: "/news", permanent: true },
      { source: "/taqrir/aatqal-almfkr", destination: "/news", permanent: true },
      { source: "/taqrir/anqtaaat-", destination: "/news", permanent: true },
      { source: "/taqrir/alastenaf-", destination: "/news", permanent: true },
      { source: "/taqrir/akhtbar-jdyd-", destination: "/news", permanent: true },
      { source: "/taqrir/qys-sayd-fy-", destination: "/news", permanent: true },
      { source: "/taqrir/iydaa-9-", destination: "/news", permanent: true },
      { source: "/taqrir/shhadat-", destination: "/news", permanent: true },
      { source: "/taqrir/tayyd-alhkm-", destination: "/news", permanent: true },
      { source: "/taqrir/blagh-mn-", destination: "/news", permanent: true },

      // Old Arabic-slug WordPress article URLs → homepage
      { source: "/%D9%84%D8%A7-%D8%AA%D8%AF%D8%AE%D9%84-%D8%A7%D9%84%D8%AD%D9%84%D8%A8%D8%A9-%D8%AF%D9%88%D9%86-%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC-%D9%84%D8%A7-%D8%AA%D9%88%D8%A7%D8%AC%D9%87-%D8%B9%D8%AF%D9%88", destination: "/", permanent: true },
      { source: "/%D9%84%D8%A7-%D8%AA%D8%AF%D8%AE%D9%84-%D8%A7%D9%84%D8%AD%D9%84%D8%A8%D8%A9-%D8%AF%D9%88%D9%86-%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC-%D9%84%D8%A7-%D8%AA%D9%88%D8%A7%D8%AC%D9%87-%D8%B9%D8%AF%D9%88/", destination: "/", permanent: true },
      { source: "/%D9%86%D8%AD%D9%86-%D9%86%D9%81%D9%87%D9%85-%D8%A7%D9%84%D8%A3%D8%B2%D9%85%D8%A9-%D8%A7%D9%84%D8%A3%D9%88%D9%83%D8%B1%D8%A7%D9%86%D9%8A%D8%A9-%D9%88%D8%A3%D8%AB%D8%B1%D9%87%D8%A7-%D8%B9%D9%84%D9%89-%D8%A7", destination: "/", permanent: true },
      { source: "/%D9%86%D8%AD%D9%86-%D9%86%D9%81%D9%87%D9%85-%D8%A7%D9%84%D8%A3%D8%B2%D9%85%D8%A9-%D8%A7%D9%84%D8%A3%D9%88%D9%83%D8%B1%D8%A7%D9%86%D9%8A%D8%A9-%D9%88%D8%A3%D8%AB%D8%B1%D9%87%D8%A7-%D8%B9%D9%84%D9%89-%D8%A7/", destination: "/", permanent: true },
      { source: "/%D9%82%D9%88%D8%A7%D8%B9%D8%AF-%D8%A7%D9%84%D8%AA%D8%B9%D8%A7%D9%85%D9%84-%D9%85%D8%B9-%D8%A7%D9%84%D9%85%D8%AE%D8%A7%D9%84%D9%81", destination: "/", permanent: true },
      { source: "/%D9%82%D9%88%D8%A7%D8%B9%D8%AF-%D8%A7%D9%84%D8%AA%D8%B9%D8%A7%D9%85%D9%84-%D9%85%D8%B9-%D8%A7%D9%84%D9%85%D8%AE%D8%A7%D9%84%D9%81/", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
