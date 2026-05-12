import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/saved", "/dashboard", "/preview/"],
      },
    ],
    sitemap: "https://statesubsidies.com/sitemap.xml",
    host: "https://statesubsidies.com",
  };
}
