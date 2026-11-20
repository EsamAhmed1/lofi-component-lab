import { getEntry, registry } from "@/registry";
import { metaDescription } from "@/lib/site";
import { ogCard, ogSize } from "../../og-card";

export const alt = "Component preview card";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return registry.map((entry) => ({ slug: entry.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getEntry(slug);
  return ogCard({
    eyebrow: "Lofi Component Lab",
    title: entry?.name ?? "Component",
    description: entry ? metaDescription(entry.summary, 150) : "",
    chips: entry ? [entry.kind, `Week ${String(entry.week).padStart(2, "0")}`, "React + Tailwind"] : [],
  });
}
