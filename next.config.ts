import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
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
