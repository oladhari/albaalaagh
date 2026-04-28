import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      // News articles written by البلاغ are served at /taqrir/[slug].
      // Old URLs (before the url field was corrected) pointed to /news/[slug].
      { source: "/news/:slug", destination: "/taqrir/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
