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
import { week10 } from "./weeks/week-10";
import { week11 } from "./weeks/week-11";
import { week12 } from "./weeks/week-12";
import { week13 } from "./weeks/week-13";

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
  ...week10,
  ...week11,
  ...week12,
  ...week13,
];

export function getEntry(slug: string): RegistryEntry | undefined {
  return registry.find((entry) => entry.slug === slug);
}
