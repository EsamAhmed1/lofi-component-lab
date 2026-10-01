# Week 01 submissions (1–7 Oct 2026)

Copy each block into the lofidb channel as **its own post** (one post per submission). Replace `LS ____` with your LS number.

---

## Post 1 — Overview

**LofiStack 90 Day Build Challenge — Esam (LS ____)**

This is my submission: https://lofi-component-lab.vercel.app

- **2 components** shipped in Week 1 (Type: button, section). React + TypeScript + Tailwind CSS, Next.js 16.
- Every component page has a live demo with Desktop / Tablet / Mobile widths, usage code, the full source, a props table and the final prompt.
- **Build notes** on every component: what went wrong while building it and how it was fixed.
- **Agent log** for Week 1 is under Logs on the site.
- Every page is tested in **Chromium, Firefox and WebKit, in light and dark mode**, at 375 / 768 / 1280 px, and passes an **axe WCAG 2.1 AA scan with 0 violations** (24/24 checks).
- Public repo: https://github.com/EsamAhmed1/lofi-component-lab
- 90-day plan (30 components, 13 agent logs): https://github.com/EsamAhmed1/lofi-component-lab/blob/main/ROADMAP.md

Will keep adding 2+ components every week. @LofiDB

---

## Post 2 — Component 1

```
Week: 01
Type: button
Component: Magnetic Button
Live: https://lofi-component-lab.vercel.app/components/magnetic-button
Repo: https://github.com/EsamAhmed1/lofi-component-lab/blob/main/src/components/ui/magnetic-button.tsx
Prompt:
Build a reusable React + TypeScript + Tailwind CSS v4 "MagneticButton" component for a Next.js App Router project.

Requirements:
- Client component that forwards its ref and spreads all native <button> props.
- Props (typed interface): variant ("solid" | "outline" | "ghost"), size ("sm" | "md" | "lg"), strength (px the button drifts toward the pointer, 0 = off), loading, loadingLabel, leftIcon, rightIcon, fullWidth.
- Magnetic effect: on pointer move, translate the button toward the cursor (x by strength, y by 60% of it) using CSS custom properties updated inside requestAnimationFrame; reset on pointer leave. A soft radial "glow" follows the cursor inside the button.
- Skip the magnet and glow for touch pointers, when disabled or loading, and when prefers-reduced-motion is set (listen for changes).
- States: hover, focus-visible ring with offset, active press scale, disabled (opacity + not-allowed cursor), loading (spinner centred over a hidden label, aria-busy, clicks ignored, sr-only loading text).
- Use theme tokens (bg-accent, text-accent-foreground, border-border, bg-surface) so it works in light and dark mode.
- No external dependencies. Keep it accessible and fully responsive; add a fullWidth option for mobile layouts.
Also write a demo showing all variants, sizes, a working async loading example, a disabled button, strength={0}, and a full-width button.
```

---

## Post 3 — Component 2

```
Week: 01
Type: section
Component: Testimonial Marquee
Live: https://lofi-component-lab.vercel.app/components/testimonial-marquee
Repo: https://github.com/EsamAhmed1/lofi-component-lab/blob/main/src/components/ui/testimonial-marquee.tsx
Prompt:
Build a reusable React + TypeScript + Tailwind CSS v4 "TestimonialMarquee" section component for a Next.js App Router project. It should work as a Server Component (no client JS).

Requirements:
- Props (typed interfaces): testimonials: { quote, name, role?, avatarUrl?, rating? }[], heading?, subheading?, rows (1 | 2, default 2), duration (seconds per loop), pauseOnHover (default true), ariaLabel, className.
- Each testimonial is a <figure> card with an optional 5-star rating (role="img" with an "N out of 5 stars" label), the quote in a <blockquote>, and a figcaption with avatar (image or initials fallback), name and role.
- Infinite horizontal marquee done in pure CSS: render the list twice side by side and animate translateX(0 → -50%) with a keyframe; the duplicate list is aria-hidden. Row two runs in reverse. Speed comes from a CSS variable set from the duration prop.
- Fade the edges with a mask gradient. Pause the animation on hover and on focus-within.
- prefers-reduced-motion: stop the animation, hide the duplicate list, remove the mask and make the row horizontally scrollable instead.
- Use a <section> with aria-labelledby (useId for the heading id) or aria-label when there is no heading. Return null for an empty list.
- Responsive: narrower cards and gaps on mobile. Use theme tokens (bg-surface, border-border, text-muted, accent) for light and dark mode.
Also write a demo with eight realistic testimonials across two rows.
```

---

## Post 4 — Agent log

```
Week: 01
Task: Set up, build, test and deploy my component gallery site with the first two components
Agent: Claude Code (Claude Opus 5.5) in the Claude desktop app
Prompt or workflow:
I pasted the full 90 Day Build Challenge brief (Track A + Track B rules and the tech stack requirements) and wrote: "understand this and start working on this".
The agent then:
1. Turned the brief into a plan: Next.js + TypeScript + Tailwind gallery, one route per component, live preview + code + props + prompt on every page, and a 30-component / 13-log roadmap.
2. Scaffolded Next.js 16 and read the bundled Next 16 docs before coding (params are now a Promise).
3. Built Magnetic Button and Testimonial Marquee with typed props and all UI states.
4. Built the site: component registry, preview with Desktop/Tablet/Mobile widths, highlighted code with copy, accessible tabs, props table.
5. Wrote a Playwright suite (Chromium, Firefox, WebKit × light/dark, 375/768/1280 px, axe WCAG 2.1 AA scan). It caught low-contrast code colours, which the agent fixed.
6. Created the public GitHub repo, pushed it, imported it into Vercel and deployed.
Result: Live gallery at https://lofi-component-lab.vercel.app with 2 components, 24/24 cross-browser checks passing and 0 accessibility violations. Saved roughly 4–5 hours of setup, boilerplate and testing; I only had to approve the GitHub and Vercel logins.
```
