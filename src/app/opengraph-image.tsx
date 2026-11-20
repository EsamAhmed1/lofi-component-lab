import { registry } from "@/registry";
import { ogCard, ogSize } from "./og-card";

export const alt = "Lofi Component Lab: reusable React + Tailwind components";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    eyebrow: "Lofi Component Lab",
    title: "Reusable components, shipped every week.",
    description: "Typed, responsive and accessible React + Tailwind components for the LofiStack 90 Day Build Challenge.",
    chips: [`${registry.length} components`, "Light + dark", "WCAG 2.1 AA tested"],
  });
}
