# Lofi Component Lab

A growing gallery of reusable UI components, built for the **LofiStack 90 Day Build Challenge** (Track A).

Every component:

- is written in **React + TypeScript** with typed props (no hardcoded content, everything comes in via props)
- is styled with **Tailwind CSS v4** using shared theme tokens, so it works in light and dark mode
- is responsive (mobile, tablet, desktop) and handles its UI states (hover, focus, active, disabled, loading where relevant)
- is accessible (keyboard support, focus rings, ARIA where needed, reduced-motion support)
- has its own page at `/components/<slug>` with a live preview, a width switcher, usage code, full source, a props table and the build prompt

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Code highlighting | Shiki (rendered at build time) |
| Hosting | Vercel |

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Add a new component

1. Put the component in `src/components/ui/<name>.tsx`. Export a typed props interface.
2. Put a demo in `src/components/demos/<name>-demo.tsx` (default export).
3. Add an entry to `src/registry/index.ts` with the slug, `kind` (button, form, card, modal, navbar, table, loader, section, chart, input), week, usage snippet, props and the final prompt.
4. `npm run build` and push. The page appears at `/components/<slug>` automatically.

## Components

| Week | Component | Type | Page |
|---|---|---|---|
| 01 | Magnetic Button | button | `/components/magnetic-button` |
| 01 | Testimonial Marquee | section | `/components/testimonial-marquee` |

The full 90-day plan is in [ROADMAP.md](ROADMAP.md). Weekly submission drafts are in [`submissions/`](submissions).
