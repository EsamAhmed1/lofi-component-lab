import BurstLikeButtonDemo from "@/components/demos/burst-like-button-demo";
import IslandNavbarDemo from "@/components/demos/island-navbar-demo";
import type { RegistryEntry } from "../types";

export const week09: RegistryEntry[] = [
  {
    slug: "burst-like-button",
    name: "Burst Like Button",
    kind: "button",
    week: 9,
    added: "2026-11-20",
    summary:
      "A toggle reaction button. Liking pops the icon, fires a ring and a burst of particles, and rolls the count like an odometer. It saves optimistically and shakes back if the save fails.",
    source: "src/components/ui/burst-like-button.tsx",
    Demo: BurstLikeButtonDemo,
    states: ["liked", "unliked", "saving", "save failed", "hover", "focus-visible", "pressed", "disabled", "icon only", "reduced motion"],
    usage: `import { BurstLikeButton } from "@/components/ui/burst-like-button";

export function PostActions({ post }: { post: Post }) {
  return (
    <div className="flex items-center gap-2">
      <BurstLikeButton
        icon="heart"
        count={post.likes}
        defaultPressed={post.likedByMe}
        // The button updates at once and reverts if this rejects.
        onToggle={(liked) => api.setLike(post.id, liked)}
      />
      <BurstLikeButton icon="bookmark" variant="icon" label="Save post" />
    </div>
  );
}`,
    props: [
      { name: "pressed", type: "boolean", description: "Pressed state (controlled)." },
      { name: "defaultPressed", type: "boolean", default: "false", description: "Starting state when uncontrolled." },
      { name: "onToggle", type: "(next: boolean) => void | Promise<unknown>", description: "Called with the next state. If the returned Promise rejects, the button reverts, shakes and announces the error." },
      { name: "count", type: "number", description: "Total count. Uncontrolled: the starting total, adjusted by one as you toggle. Controlled: shown as is." },
      { name: "icon", type: '"heart" | "star" | "bookmark" | "thumb" | { icon, activeIcon?, color, particles? }', default: '"heart"', description: "A preset with its own colour and particles, or a custom icon." },
      { name: "label", type: "string", default: "preset label", description: 'Accessible name of the action, e.g. "Like". The count is added to it.' },
      { name: "countNoun", type: "{ one: string; other: string }", default: "preset noun", description: 'Words for the count in the accessible name, e.g. { one: "like", other: "likes" }.' },
      { name: "messages", type: "{ on?, off?, error? }", description: "Text the live region reads after a toggle or a failed save." },
      { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height, icon size and text size." },
      { name: "variant", type: '"pill" | "icon"', default: '"pill"', description: "Icon and count, or icon only." },
      { name: "formatCount", type: "(count: number) => string", default: "compact (1.2K)", description: "Formats the visible count." },
      { name: "disabled", type: "boolean", default: "false", description: "Blocks toggling and dims the button." },
      { name: "className", type: "string", description: "Extra classes for the button. Other button attributes and ref are forwarded." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "BurstLikeButton" (toggle reaction button) for Next.js App Router.

- Typed props: pressed / defaultPressed, onToggle(next) (may return a Promise), count, icon ("heart" | "star" | "bookmark" | "thumb" or { icon, activeIcon, color, particles }), label, size (sm | md | lg), variant ("pill" | "icon"), disabled, formatCount (default compact: 1.2K).
- Like: squash-and-stretch icon pop, expanding ring and 12 dots and mini icons bursting out radially (WAAPI; positions from the index plus seeded jitter, no Math.random in render). Unlike: the icon deflates.
- Odometer count: each changed character rolls up on like and down on unlike, rightmost first.
- Optimistic: update at once. If the Promise rejects, revert, shake, show a red ring and announce the error. Ignore clicks while saving (aria-busy).
- Each preset has its own colour (a --burst variable set per colour scheme for 4.5:1 text contrast) and particle palette.
- A11y: native button with aria-pressed and aria-label "Like, 1,204 likes", a polite live region for the new state, visible focus ring, disabled state.
- Reduced motion (live media query): no particles, pop or roll; colour and number change instantly.
- No dependencies, light/dark tokens, fits 375px.
Demo: social post card with a gradient image, heart and star pills, bookmark and custom flame icon buttons, a flaky-network thumb that always fails, sizes and a disabled button.`,
    notes: [
      "A 0 to 9 digit strip would roll backwards through every digit when 9 becomes 10. Each character instead rolls the old glyph out and the new one in, in the direction the count moved, so likes always roll up.",
      "Reduced motion is read with useSyncExternalStore. The server snapshot is false, so hydration matches, and a change to the OS setting applies live without setting state in an effect.",
      "Preset colours are a --burst CSS variable with a light and a dark value. The light values are darker shades (amber-700 for the star, sky-700 for the bookmark) so the count keeps 4.5:1 contrast on the tinted pill.",
      "The live region sits next to the button, not inside it. The button keeps a stable name like \"Like, 1,249 likes\" and the status message is read on its own.",
    ],
  },
  {
    slug: "island-navbar",
    name: "Island Navbar",
    kind: "navbar",
    week: 9,
    added: "2026-11-20",
    summary:
      "A floating pill navbar that morphs like the iPhone Dynamic Island. It grows in place into a mega menu, a search panel or a notifications list, with a pointer spotlight and a sliding active pill.",
    source: "src/components/ui/island-navbar.tsx",
    Demo: IslandNavbarDemo,
    states: ["resting", "mega menu", "search", "no results", "notifications", "unread", "all caught up", "active link", "hover spotlight", "focus-visible", "Esc / outside click", "mobile panel", "dark / glass", "reduced motion"],
    usage: `import { IslandNavbar, type IslandNavLink } from "@/components/ui/island-navbar";

const links: IslandNavLink[] = [
  {
    id: "product",
    label: "Product",
    children: [
      { id: "dashboards", label: "Dashboards", href: "/dashboards", icon: <GridIcon />, description: "Live charts for the whole team." },
      { id: "alerts", label: "Alerts", href: "/alerts", icon: <BellIcon />, description: "Get pinged when a metric moves." },
    ],
  },
  { id: "pricing", label: "Pricing", href: "/pricing" },
  { id: "docs", label: "Docs", href: "/docs" },
];

export function SiteHeader({ pathname }: { pathname: string }) {
  return (
    <IslandNavbar
      position="sticky"
      brand={<Link href="/">Lumen</Link>}
      links={links}
      activeId={pathname.slice(1)}
      searchItems={searchIndex}
      notifications={notifications}
      onMarkAllRead={markAllRead}
      actions={<AccountButton />}
    />
  );
}`,
    props: [
      { name: "brand", type: "ReactNode", description: "Logo or wordmark, usually a home link." },
      { name: "links", type: "IslandNavLink[]", description: "{ id, label, href?, icon?, description?, children? }. A link with children opens a mega menu." },
      { name: "activeId", type: "string", description: "Id of the current page. Sets aria-current and moves the active pill. A parent is highlighted when a child is active." },
      { name: "onNavigate", type: "(item, event) => void", description: "Called when a link, menu item or search result is chosen. The panel then closes and focus returns to its trigger." },
      { name: "notifications", type: "IslandNotification[]", description: "{ id, title, body, time, unread? }. Shows a bell with an unread dot and a notifications panel." },
      { name: "onNotificationClick", type: "(notification, event) => void", description: "Makes each notification a button." },
      { name: "onMarkAllRead", type: "() => void", description: 'Shows a "Mark all read" button when there are unread items.' },
      { name: "searchItems", type: "IslandSearchItem[]", description: "{ id, label, href?, icon?, description? }. Shows a search button and a panel that filters them." },
      { name: "onSearch", type: "(query: string) => void", description: "Called as the query changes, for remote search or analytics." },
      { name: "searchPlaceholder", type: "string", default: '"Search docs, features, pages…"', description: "Placeholder of the search input." },
      { name: "actions", type: "ReactNode", description: "Controls on the right, such as an avatar button. Also shown at the bottom of the mobile panel." },
      { name: "position", type: '"static" | "sticky"', default: '"static"', description: "Sticky pins the island to the top of its scroll container." },
      { name: "tone", type: '"dark" | "glass"', default: '"dark"', description: "Solid black pill, or frosted glass that follows the colour scheme." },
      { name: "label", type: "string", default: '"Main"', description: "Accessible name of the nav landmark." },
      { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "IslandNavbar" (Dynamic Island style nav) for Next.js App Router.

- Typed props: brand, links ({ id, label, href?, icon?, description?, children? }[]), activeId, onNavigate, notifications ({ id, title, body, time, unread }[]), onNotificationClick, onMarkAllRead, searchItems, onSearch, actions, position ("static" | "sticky"), tone ("dark" | "glass"), label.
- Resting: a floating pill with logo, links, search, bell and actions. A ResizeObserver measures the content and the shell animates width, height and radius on a spring cubic-bezier into panels: mega menu (link with children), search with filtered quick results, notifications with unread dots.
- Content stays centred so the bar does not move; panel content fades in after the morph (@starting-style). Panels overlay the page, no layout jump.
- Spotlight glow follows the pointer or focused item (CSS variables in rAF). Sliding pill under the active link.
- Esc or outside click closes. Focus moves into the panel and back to its trigger.
- Under 640px of container width: logo + menu button that morphs into a full-width link panel. No page overflow.
- A11y: nav with aria-label, triggers are buttons with aria-expanded + aria-controls, aria-current on links, labelled search input, result count in a live region.
- Reduced motion: instant open and close.
Demo: product site nav over a mock page, with a dark/glass toggle.`,
    notes: [
      "The preview frame narrows to 375px without changing the viewport, so a 640px media query would never fire there. The mobile layout uses a container query instead, and panel widths use cqw units.",
      "The shell centres its content with flexbox. When it grows, the bar stays in place and the panel opens out from the middle. Left-aligned content would slide sideways while the width animates.",
      "Panels stay in the DOM with the hidden attribute, so every aria-controls points at a real id. @starting-style fades the content in when hidden is removed, after the size morph has started.",
      "Focus leaving the nav closes it only when relatedTarget is set. Safari does not focus buttons on click, so a null relatedTarget is left to the outside-click listener. Otherwise a click on a search result could close the panel before the click lands.",
      "A keyboard audit after the build found no visible focus ring on the pill links and buttons. In Tailwind v4, outline-none sets the outline style variable to none, so focus-visible:outline-2 only changed the width. Adding focus-visible:outline-solid fixed it.",
    ],
  },
];
