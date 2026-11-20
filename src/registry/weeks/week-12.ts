import FaqAccordionDemo from "@/components/demos/faq-accordion-demo";
import ShareButtonDemo from "@/components/demos/share-button-demo";
import TagInputDemo from "@/components/demos/tag-input-demo";
import type { RegistryEntry } from "../types";

export const week12: RegistryEntry[] = [
  {
    slug: "tag-input",
    name: "Tag Input",
    kind: "input",
    week: 12,
    added: "2026-11-21",
    summary:
      "A multi-value tag field with fuzzy autocomplete. Tags become coloured chips that spring in and shrink out, duplicates shake, and pasted lists split into many tags. It supports limits, validation and plain form posts.",
    source: "src/components/ui/tag-input.tsx",
    Demo: TagInputDemo,
    states: ["typing", "suggestions", "fuzzy highlight", "create option", "chip pop", "chip remove", "Backspace select", "arrow keys", "duplicate shake", "paste split", "limit reached", "invalid", "disabled", "reduced motion"],
    usage: `import { TagInput, type TagItem } from "@/components/ui/tag-input";

const skills: TagItem[] = [
  { id: "react", label: "React", color: "#38bdf8" },
  { id: "typescript", label: "TypeScript", color: "#3178c6" },
  { id: "go", label: "Go" },
];

export function ProfileForm() {
  const [tags, setTags] = useState<TagItem[]>([]);
  return (
    <form action="/profile">
      <TagInput
        label="Skills"
        name="skills"
        suggestions={skills}
        value={tags}
        onChange={setTags}
        maxTags={8}
        validate={(label) => (label.length > 24 ? "Keep tags under 24 characters." : null)}
      />
    </form>
  );
}`,
    props: [
      { name: "label", type: "string", description: "Visible label of the field. Required." },
      { name: "value", type: "Array<string | TagItem>", description: "Selected tags (controlled). TagItem is { id, label, color?, description? }." },
      { name: "defaultValue", type: "Array<string | TagItem>", default: "[]", description: "Selected tags on first render (uncontrolled)." },
      { name: "onChange", type: "(tags: TagItem[], labels: string[]) => void", description: "Called after every add or remove." },
      { name: "suggestions", type: "Array<string | TagItem>", default: "[]", description: "Options for the autocomplete. A typed string that matches a label uses that option's id and colour." },
      { name: "placeholder", type: "string", default: '"Add a tag…"', description: "Shown while there are no tags." },
      { name: "description", type: "string", description: "Helper text under the field. An error replaces it visually." },
      { name: "maxTags", type: "number", description: "Limit. Shows a 3/8 counter and blocks more tags." },
      { name: "allowCustom", type: "boolean", default: "true", description: "Allow free text and show the Create option. When false, only suggestions can be added." },
      { name: "validate", type: "(label: string, tags: TagItem[]) => string | null | undefined", description: "Return an error message to reject a tag. It shows inline and is announced." },
      { name: "disabled", type: "boolean", default: "false", description: "Locks the field and hides the remove buttons." },
      { name: "name", type: "string", description: "Renders one hidden input per tag (value = tag id) for plain form posts." },
      { name: "maxSuggestions", type: "number", default: "8", description: "How many suggestions show at once." },
      { name: "className", type: "string", description: "Extra classes on the wrapper." },
      { name: "ref", type: "Ref<HTMLInputElement>", description: "Forwarded to the text input." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 TagInput, no dependencies: spring colour chips, fuzzy autocomplete, paste split. Typed props, responsive, light/dark, combobox ARIA, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called TagInput with no dependencies: a multi-value tag field with autocomplete. Typing opens a suggestion list with fuzzy match highlighting and a Create option. Enter, comma or Tab adds a tag, and pasting \"a, b; c\" adds three. Chips are coloured, spring in and shrink out. Backspace on an empty input selects the last chip and a second Backspace removes it. Duplicates shake. Typed props (value, defaultValue, onChange, suggestions, label, placeholder, maxTags with a 4/8 counter, allowCustom, validate with an inline error, disabled, name for hidden inputs), responsive, light and dark mode, accessible (combobox + listbox with aria-activedescendant, \"Remove React\" buttons, live announcements), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "TagInput" (multi-value tag field with autocomplete) for Next.js App Router.

- Props: value / defaultValue / onChange (string or { id, label, color?, description? }), suggestions, label, description, placeholder, maxTags, allowCustom, validate(label, tags) → error, disabled, name, maxSuggestions, className, ref.
- Combobox input + listbox with aria-activedescendant. Fuzzy match (prefix > word start > substring > letters in order) with highlighted letters. Strong matches, then "Create 'xyz'", then loose matches.
- Enter, comma or Tab adds. Pasting "a, b; c" splits into tags; rejected text goes back into the input.
- Chips tinted with the suggestion colour or an FNV hash of the text. They pop in with a damped spring sampled into a CSS linear() easing (Web Animations API) and shrink out before onChange fires.
- Backspace on an empty input focuses the last chip, a second Backspace removes it. Arrows, Home and End move between chips.
- Duplicates shake the existing chip. maxTags shows a "4/8" counter and blocks more. validate shows an inline error with aria-invalid.
- Each chip has a "Remove React" button. A polite live region announces adds, removes and errors. Hidden inputs per tag when name is set.
- Gradient focus border, light/dark tokens. Reduced motion: no pop or shrink, a flash instead of the shake.
Demo: a Skills form with 40 tech suggestions and a limit of 8, email recipients with validation, and a disabled field.`,
    notes: [
      "Removing a chip waits for its shrink animation before calling onChange. Two quick removals could each commit an old list and undo each other. The removal now reads the latest tags from a ref when its animation ends, so both stick.",
      "Enter after a few letters could grab a weak match by accident, such as an email that happens to contain those letters in order. The list puts contiguous matches first, then the Create option, then letter-order matches, so the highlighted choice is always a sensible one.",
      "A comma is handled in onChange, not keydown, because mobile keyboards often report the key as Unidentified. Paste runs the same split, so \"a, b; c\" adds three tags.",
      "The pop is real spring physics: a damped spring is sampled into a CSS linear() easing and played with the Web Animations API. Browsers without linear() get an overshooting cubic-bezier instead.",
    ],
  },
  {
    slug: "share-button",
    name: "Share Button",
    kind: "button",
    week: 12,
    added: "2026-11-21",
    summary:
      "A share button that blooms open into a spring-loaded arc of share targets, or a sliding row when space is tight. Copy link turns into a check with a confetti pop and a Copied! tooltip.",
    source: "src/components/ui/share-button.tsx",
    Demo: ShareButtonDemo,
    states: ["closed", "radial fan", "row", "flipped arc", "hover", "focus-visible", "pressed", "tooltip", "copied", "copy failed", "native share", "Escape / outside click", "arrow keys", "icon only", "sm / md / lg", "reduced motion"],
    usage: `import { ShareButton } from "@/components/ui/share-button";

export function PostFooter({ post }: { post: { url: string; title: string } }) {
  return (
    <footer className="flex items-center justify-between">
      <Author />
      <ShareButton
        url={post.url}
        title={post.title}
        variant="radial"
        preferNative
        onShare={(id) => track("share", { id })}
      />
    </footer>
  );
}`,
    props: [
      { name: "url", type: "string", description: "The link to share. Required." },
      { name: "title", type: "string", default: '""', description: "Used in share text and links." },
      { name: "text", type: "string", description: "Extra text for navigator.share." },
      { name: "targets", type: "ShareTarget[]", default: "X, LinkedIn, WhatsApp, Email, Copy link", description: "{ id, label, icon, href?(url, title), onClick?(url, title), copy?, color? }. href renders a link, copy copies the url." },
      { name: "variant", type: '"radial" | "row"', default: '"radial"', description: "Arc around the trigger, or a row that slides out beside it. Radial falls back to a row when there is no room." },
      { name: "placement", type: '"top" | "bottom"', default: '"top"', description: "Side the arc opens on. It flips when that side has no room." },
      { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Trigger and target size (36, 44 or 52px) and arc radius." },
      { name: "label", type: "string", default: '"Share"', description: "Trigger text, and its accessible name when iconOnly." },
      { name: "iconOnly", type: "boolean", default: "false", description: "Round trigger with only the share icon." },
      { name: "preferNative", type: "boolean", default: "false", description: "Use navigator.share when the browser has it. A cancelled sheet does nothing." },
      { name: "onShare", type: "(targetId: string) => void", description: "Called after a target is used, or with \"native\"." },
      { name: "className", type: "string", description: "Extra classes on the wrapper." },
      { name: "ref", type: "Ref<HTMLButtonElement>", description: "Forwarded to the trigger." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 ShareButton, no dependencies: blooms into a spring fan of targets, confetti copy-link. Typed props, responsive, light/dark, keyboard + ARIA, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called ShareButton with no dependencies: a share button that blooms open. Clicking it fans out round share targets (X, LinkedIn, WhatsApp, Email, Copy link) on an arc with a springy stagger. When there is no room it becomes a row that slides out beside the button. Copy link morphs into a check with a confetti pop and a Copied! tooltip. Uses navigator.share when preferNative is set. Typed props (url, title, targets with href or onClick, variant radial or row, placement, size, label, iconOnly, onShare, className), responsive, light and dark mode, accessible (aria-expanded and aria-controls, named links and buttons, arrow keys, Escape and outside click return focus, \"Link copied\" live region), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "ShareButton" (share button that blooms into share targets) for Next.js App Router.

- Props: url, title, text, targets ({ id, label, icon, href?(url, title), onClick?, copy?, color? }), variant ("radial" | "row"), placement ("top" | "bottom"), size (sm / md / lg), label, iconOnly, preferNative, onShare, className, ref. Defaults: X, LinkedIn, WhatsApp, Email, Copy link built from url and title.
- Radial: targets fan out on a 150° arc around the trigger, springing out with a 40ms stagger over a soft glow, with a ring pulse on the trigger. The spring is a damped spring sampled into a CSS linear() easing.
- On open, measure the room inside the nearest clipping ancestor. No room sideways → row mode; no room above → flip the arc. Row mode grows in the flow with a grid-template-columns transition.
- Copy link: navigator.clipboard with a textarea fallback. The icon morphs into a check, seeded confetti bursts and a Copied! tooltip shows.
- preferNative uses navigator.share; a cancelled sheet does nothing.
- A11y: trigger with aria-expanded and aria-controls, a list of named links or buttons (inert when closed), arrow keys / Home / End, Escape or outside click closes and returns focus, tooltips on hover and focus, live region "Link copied".
- Light/dark tokens. Reduced motion: no spring, confetti or pulse.
Demo: a blog post footer with a row, a radial launch card and a compact icon-only button in a toolbar.`,
    notes: [
      "The first version checked the parent's width to choose between the arc and the row. Inside a small toolbar the parent is narrow even with plenty of room around it, so it fell back to a row. It now measures the space around the trigger inside the nearest clipping ancestor when it opens, and flips the arc below when there is no room above.",
      "The row grows in the flow with a grid-template-columns 0fr to 1fr transition. That needs overflow hidden, which would clip the tooltips, so the overflow only turns visible once the transition has ended.",
      "The spring easing is set inline as a CSS linear() value. Browsers without linear() drop the value and fall back to a plain ease, so nothing breaks.",
      "Confetti angles and sizes come from a seeded random function at module scope, so the server and the client render the same markup.",
    ],
  },
  {
    slug: "faq-accordion",
    name: "FAQ Accordion",
    kind: "section",
    week: 12,
    added: "2026-11-21",
    summary:
      "A complete FAQ section with live search that highlights matches, category tabs with a sliding pill, and answers that open with a smooth height animation. Items open from the URL hash and ask \"Was this helpful?\".",
    source: "src/components/ui/faq-accordion.tsx",
    Demo: FaqAccordionDemo,
    states: ["closed", "open", "single / multiple", "search highlight", "tab pill", "tab counts", "deep link", "feedback", "thanks", "empty state", "hover", "focus-visible", "two columns / stacked", "reduced motion"],
    usage: `import { FaqAccordion, type FaqItem } from "@/components/ui/faq-accordion";

const items: FaqItem[] = [
  { id: "trial", category: "Billing", question: "How long is the free trial?", answer: "14 days, no card needed." },
  { id: "sso", category: "Security", question: "Do you support SSO?", answer: <p>Yes, on <a href="/pricing">Business</a>.</p>, answerText: "Yes, on Business." },
];

export default function FaqPage() {
  return (
    <FaqAccordion
      title="Questions, answered"
      description="Everything about plans and your account."
      items={items}
      type="single"
      contactHref="/support"
      onFeedback={(id, helpful) => track("faq_feedback", { id, helpful })}
    />
  );
}`,
    props: [
      { name: "items", type: "FaqItem[]", description: "{ id, question, answer: ReactNode, category?, answerText?, keywords? }. id is the DOM id used for deep links. Required." },
      { name: "title", type: "string", default: '"Frequently asked questions"', description: "Section heading." },
      { name: "description", type: "ReactNode", description: "Intro under the heading." },
      { name: "categories", type: "string[]", default: "categories used by items", description: "Tab names after the All tab. Tabs hide when there is only one." },
      { name: "type", type: '"single" | "multiple"', default: '"single"', description: "One answer open at a time, or many." },
      { name: "defaultOpen", type: "string | string[]", description: "Item ids open on first render." },
      { name: "searchable", type: "boolean", default: "true", description: "Shows the live search box." },
      { name: "onFeedback", type: "(id: string, helpful: boolean) => void", description: "Called when someone answers \"Was this helpful?\"." },
      { name: "contactHref", type: "string", description: "Link for the Contact support card and the empty state. Hidden when not set." },
      { name: "contactLabel", type: "string", default: '"Contact support"', description: "Text of the contact links." },
      { name: "allLabel", type: "string", default: '"All"', description: "Label of the first tab." },
      { name: "headingLevel", type: "2 | 3", default: "2", description: "Level of the title. Questions use the next level." },
      { name: "className", type: "string", description: "Extra classes on the section." },
      { name: "ref", type: "Ref<HTMLElement>", description: "Forwarded to the section element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 FaqAccordion, no dependencies: live search, category tabs, animated answers, deep links. Typed props, responsive, light/dark, ARIA tabs, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called FaqAccordion with no dependencies: a full FAQ section with a search box that filters questions live and highlights matches, and category tabs with counts and a sliding pill. Answers open with a smooth grid-template-rows animation and a rotating plus. Each item has an id and opens when the URL hash matches. Per-item \"Was this helpful?\" feedback and an empty state with Contact support. Typed props (title, description, categories, items, type, defaultOpen, searchable, onFeedback, contactHref, className), two columns on wide containers and stacked on narrow ones, light and dark mode, accessible (aria-expanded buttons, labelled regions, tablist with arrow keys, result count in a live region), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "FaqAccordion" (complete FAQ section) for Next.js App Router.

- Props: title, description, categories, items ({ id, question, answer: ReactNode, category?, answerText?, keywords? }), type ("single" | "multiple"), defaultOpen, searchable, onFeedback(id, helpful), contactHref, contactLabel, allLabel, headingLevel, className, ref.
- Container query layout: intro, search and a "Still stuck?" card on the left, tabs and list on the right; stacked on narrow containers.
- Live search over question, answerText and keywords. Every word must match; matches are highlighted with <mark>.
- Category tabs with counts and a sliding pill placed by a layout effect writing CSS variables. role=tablist, roving tabindex, arrows / Home / End.
- Accordion: h3 buttons with aria-expanded and aria-controls, regions labelled by the buttons. Height animates with grid-template-rows 0fr → 1fr; closed answers are inert. Plus rotates into a minus, a gradient bar grows on the open card.
- Deep links: each item's DOM id is its id. Read the hash with useSyncExternalStore; a match opens the item and resets search and tab.
- "Was this helpful? 👍 👎" per item, then a thank-you line. Empty state with Clear search and Contact support.
- Polite live region with the result count. Light/dark tokens, reduced motion turns transitions off.
Demo: 12 SaaS FAQs in 4 categories with a feedback readout.`,
    notes: [
      "Answers animate with grid-template-rows from 0fr to 1fr instead of measured heights. It works with any answer content and needs no JavaScript. Closed answers are inert, so their links are skipped by Tab and screen readers.",
      "The URL hash is read with useSyncExternalStore, which returns an empty string on the server, so hydration matches. When the hash changes, the matching item opens during render and the search and tab reset, so the item is never hidden by a filter.",
      "The sliding pill is placed in a layout effect that writes CSS variables, so it does not re-render and never paints in the wrong spot. A ResizeObserver keeps it aligned when the tab strip resizes.",
      "Answers can be JSX, which cannot be searched. Items take an optional answerText for search, and plain string answers are searched and highlighted directly.",
    ],
  },
];
