import type { RegistryEntry } from "./types";
import { week01 } from "./weeks/week-01";
import { week02 } from "./weeks/week-02";
import { week03 } from "./weeks/week-03";
import { week04 } from "./weeks/week-04";
import { week05 } from "./weeks/week-05";
import { week06 } from "./weeks/week-06";
import { week07 } from "./weeks/week-07";
import { week08 } from "./weeks/week-08";
import { week09 } from "./weeks/week-09";

export type { ComponentKind, PropDoc, RegistryEntry } from "./types";

/** Every component, in the order it shipped. Each week lives in its own file under ./weeks. */
export const registry: RegistryEntry[] = [
  ...week01,
  ...week02,
  ...week03,
  ...week04,
  ...week05,
  ...week06,
  ...week07,
  ...week08,
  ...week09,
];

export function getEntry(slug: string): RegistryEntry | undefined {
  return registry.find((entry) => entry.slug === slug);
}
