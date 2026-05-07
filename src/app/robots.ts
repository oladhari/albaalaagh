import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/writer/"],
      },
    ],
    sitemap: "https://www.albaalaagh.com/sitemap.xml",
    host: "https://www.albaalaagh.com",
  };
}
