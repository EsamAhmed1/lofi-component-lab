import type { ComponentType } from "react";

/** Plain type label used for the challenge submission (keeps components distinct). */
export type ComponentKind =
  | "button"
  | "form"
  | "card"
  | "modal"
  | "navbar"
  | "table"
  | "loader"
  | "section"
  | "chart"
  | "input";

export interface PropDoc {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export interface RegistryEntry {
  slug: string;
  name: string;
  kind: ComponentKind;
  /** Challenge week the component shipped in. */
  week: number;
  /** Date it was added, YYYY-MM-DD. */
  added: string;
  summary: string;
  /** Path of the component source, relative to the project root. */
  source: string;
  /** Interactive demo rendered in the preview pane. */
  Demo: ComponentType;
  usage: string;
  props: PropDoc[];
  /** States the component handles, shown as chips. */
  states: string[];
  /** The final prompt used to build it (required by the challenge). */
  prompt: string;
  /** Short version of the prompt for the Discord post. */
  postPrompt?: string;
  /** One-paragraph prompt for the single weekly Discord post. */
  brief?: string;
  /** What went wrong while building it and how it was fixed. */
  notes: string[];
}
