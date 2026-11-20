import type { MetadataRoute } from "next";
import { registry } from "@/registry";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const latest = registry.reduce((max, entry) => (entry.added > max ? entry.added : max), "");
  return [
    { url: SITE_URL, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/components`, lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/logs`, lastModified: latest, changeFrequency: "weekly", priority: 0.6 },
    ...registry.map((entry) => ({
      url: `${SITE_URL}/components/${entry.slug}`,
      lastModified: entry.added,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
