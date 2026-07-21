import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

type DocsMetadataOptions = {
  locale: string;
  path: `/docs/${string}`;
  title: string;
  description: string;
  imageAlt: string;
};

const SITE_URL = "https://firsttx.store";
const OG_IMAGE = `${SITE_URL}/opengraph-image.png`;

export function createDocsMetadata({ locale, path, title, description, imageAlt }: DocsMetadataOptions): Metadata {
  const canonical = `${SITE_URL}/${locale}${path}`;
  const languages: Record<string, string> = Object.fromEntries(routing.locales.map((supportedLocale) => [supportedLocale, `${SITE_URL}/${supportedLocale}${path}`]));
  languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}
