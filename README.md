# Lofi Component Lab

**Live:** https://lofi-component-lab.vercel.app

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

## Quality checks

```bash
npm test
```

Builds the site and runs Playwright in **Chromium, Firefox and WebKit, in light and dark mode**. Every page is loaded at 375, 768 and 1280 px (no horizontal overflow allowed), fails on any console error, and gets an **axe WCAG 2.1 AA** scan. The results are written to `src/registry/quality.json` and shown on each component page.

## Add a new component

1. Put the component in `src/components/ui/<name>.tsx`. Export a typed props interface.
2. Put a demo in `src/components/demos/<name>-demo.tsx` (default export).
3. Add an entry to that week's file in `src/registry/weeks/week-NN.ts` (create it and add it to `src/registry/index.ts` for a new week) with the slug, `kind` (button, form, card, modal, navbar, table, loader, section, chart, input), week, usage snippet, props, the final prompt and build notes.
4. Run `npm test`, then push. The page appears at `/components/<slug>` automatically.
5. Add the week's agent log to `src/registry/logs.ts` (shown at `/logs`).
6. Run `node scripts/submissions.mjs <week>` to write the Discord posts to `submissions/week-NN.md` (it fails if a post is over 2,000 characters).

## Components

| Week | Component | Type | Page |
|---|---|---|---|
| 01 | Magnetic Button | button | [live](https://lofi-component-lab.vercel.app/components/magnetic-button) |
| 01 | Testimonial Marquee | section | [live](https://lofi-component-lab.vercel.app/components/testimonial-marquee) |
| 02 | Command Palette | modal | [live](https://lofi-component-lab.vercel.app/components/command-palette) |
| 02 | OTP Code Input | input | [live](https://lofi-component-lab.vercel.app/components/otp-input) |
| 03 | Magnify Dock | navbar | [live](https://lofi-component-lab.vercel.app/components/magnify-dock) |
| 03 | Aurora Hero | section | [live](https://lofi-component-lab.vercel.app/components/aurora-hero) |
| 04 | Holo Foil Card | card | [live](https://lofi-component-lab.vercel.app/components/holo-card) |
| 04 | Orbit Loader | loader | [live](https://lofi-component-lab.vercel.app/components/orbit-loader) |
| 05 | Plan Comparison Table | table | [live](https://lofi-component-lab.vercel.app/components/plan-comparison-table) |
| 05 | Slide to Confirm | button | [live](https://lofi-component-lab.vercel.app/components/slide-to-confirm) |
| 06 | Peekaboo Login Form | form | [live](https://lofi-component-lab.vercel.app/components/peekaboo-login) |
| 06 | Activity Rings | chart | [live](https://lofi-component-lab.vercel.app/components/activity-rings) |
| 07 | Morph Card Modal | modal | [live](https://lofi-component-lab.vercel.app/components/morph-card-modal) |
| 07 | Dial Knob | input | [live](https://lofi-component-lab.vercel.app/components/dial-knob) |
| 08 | Sticky Scroll Story | section | [live](https://lofi-component-lab.vercel.app/components/sticky-scroll-story) |
| 08 | Contribution Heatmap | chart | [live](https://lofi-component-lab.vercel.app/components/contribution-heatmap) |
| 09 | Burst Like Button | button | [live](https://lofi-component-lab.vercel.app/components/burst-like-button) |
| 09 | Island Navbar | navbar | [live](https://lofi-component-lab.vercel.app/components/island-navbar) |

The full 90-day plan is in [ROADMAP.md](ROADMAP.md). Weekly submission drafts are in [`submissions/`](submissions).
