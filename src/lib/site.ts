/** Production URL, used for canonical links, the sitemap and social cards. */
export const SITE_URL = "https://lofi-component-lab.vercel.app";

export const SITE_NAME = "Lofi Component Lab";

/** Search engines cut descriptions at about 160 characters; end on a whole word. */
export function metaDescription(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "")}…`;
}

/** Open Graph block for a page; child pages replace the layout's openGraph, so repeat the shared fields. */
export function openGraph(url: string, extra: { title?: string; description?: string; type?: "website" | "article" } = {}) {
  return { type: extra.type ?? "website", siteName: SITE_NAME, locale: "en_US", url, ...extra };
}
