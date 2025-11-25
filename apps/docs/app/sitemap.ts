import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://firsttx.store";

const DOC_PATHS = ["", "/docs/overview", "/docs/getting-started", "/docs/prepaint", "/docs/local-first", "/docs/tx", "/docs/devtools"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routing.locales.flatMap((locale) =>
    DOC_PATHS.map<MetadataRoute.Sitemap[number]>((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified,
      changeFrequency: "weekly",
      priority: path === "" ? 1 : 0.8,
    })),
  );
}
