# Week 02 submissions (8–14 Oct 2026)

Post each block in the lofidb channel as its own message.

## Post 1 — Component 1 (1750 characters)

```
Week: 02
Type: modal
Component: Command Palette
Live: https://lofi-component-lab.vercel.app/components/command-palette
Repo: https://github.com/EsamAhmed1/lofi-component-lab/blob/main/src/components/ui/command-palette.tsx
Prompt:
Build a reusable React + TypeScript + Tailwind v4 "CommandPalette" (⌘K menu) for Next.js App Router.

- Controlled: open / onOpenChange. Typed items: { id, label, group?, description?, keywords?, shortcut?, icon?, disabled?, onSelect }. Props: placeholder, emptyMessage, hotkey (⌘/Ctrl + letter, default "k", false = off), loading, label, closeOnSelect.
- Use native <dialog> + showModal() for focus trap, Escape, top layer and inert page. Close on backdrop click, restore focus to the opener, lock page scroll.
- Search ranking: label starts with query > word starts with it > contains > keyword > description > loose in-order match ("nwp" → "New project"). Keep group order, sort inside groups, highlight matches with <mark>.
- A11y: input is a combobox (aria-expanded, aria-controls, aria-autocomplete="list", aria-activedescendant) for a listbox of options in role="group" sections with headings. Live region announces the result count. Disabled items get aria-disabled and are skipped.
- Keys: ArrowUp/Down wrap, Home/End, Enter runs, first Esc clears the query, second closes. Keep active option in view; mousedown must not steal focus.
- States: loading skeleton (aria-busy), empty message, disabled, <kbd> shortcuts, footer hints, @starting-style entry animation that respects reduced motion.
- Responsive (max-w-xl, list capped at 60vh), light/dark tokens, no dependencies.
Demo: Actions / Navigation / Theme / Help groups with icons, shortcuts, one disabled item, a search-style trigger and a "Ran: …" readout.
```

## Post 2 — Component 2 (1604 characters)

```
Week: 02
Type: input
Component: OTP Code Input
Live: https://lofi-component-lab.vercel.app/components/otp-input
Repo: https://github.com/EsamAhmed1/lofi-component-lab/blob/main/src/components/ui/otp-input.tsx
Prompt:
Build a reusable React + TypeScript + Tailwind v4 "OtpInput" (one-time code) for Next.js App Router.

- One <input> per character. Typed props: length (6), value / defaultValue (controlled or not), onChange, onComplete (fires once when full), mode ("numeric" | "alphanumeric", upper-case letters), mask, status ("idle" | "loading" | "error" | "success"), label, message, groupSize (separator every N), disabled, name (hidden input for forms), autoFocus.
- Typing fills and advances; invalid characters are ignored. Paste fills from that box (strip spaces/dashes). SMS autofill via autocomplete="one-time-code" on box 1 (whole code may land in one box). Backspace clears or steps back; Arrow keys, Home/End move. Never allow gaps: focusing past the first empty box jumps back to it. Select on focus. Must survive very fast typing.
- A11y: role="group" labelled by the label and described by the message (polite live region); each box aria-label "Digit 3 of 6"; aria-invalid on error; correct inputMode.
- States: loading (locked + spinner), error (red + one shake, reduced-motion safe), success (green), disabled, filled highlight.
- Boxes shrink to fit 320px screens; light/dark tokens; no dependencies.
Demo: verify flow with a fake check (code shown in the hint), resend countdown, clear button, plus a masked 4-digit PIN, an 8-char alphanumeric key grouped 4-4 and a disabled example.
```

## Post 3 — Agent log (1346 characters)

```
Week: 02
Task: Research and build a niche-by-niche website inspiration moodboard in Figma, split into page sections (nav, hero, reviews, pricing, FAQ, footer…)
Agent: Claude Code (Claude Opus 5.5) + Claude in Chrome + Playwright + Figma Plugin API
Prompt or workflow:
Prompt: "Think yourself as a professional UI/UX designer. Research various websites, take inspiration and create a moodboard in Figma. Attach screenshots of individual sections and organise them. I need every niche separately with multiple inspirations." Follow-ups: pick only the best and latest designs; include every section (reviews, pricing, footer, hero, nav bar); add more niches with multiple inspirations per section.
Workflow: 1) Pulled 2025–2026 Awwwards winners for 11 niches and built the boards directly in Figma via the Plugin API. 2) Playwright captured ~140 leading sites across 21 niches, split each page into sections, auto-labelled them and removed cookie pop-ups. 3) Contact sheets for hand-picking the best of each section. 4) Uploaded picks into labelled "Page Sections" boards, one row per section type.
Result: Finished Figma moodboard with 23 named pages: cover + index, 11 award-winner boards (153 refs) and one page per niche for 21 niches with 1,361 hand-picked, labelled section screenshots (1,514 references total). Saved well over a week of manual screenshotting, cropping and labelling.
```
