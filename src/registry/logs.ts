export interface AgentLog {
  week: number;
  date: string;
  /** "done" = agent completed it; "not-possible" = task an agent could not handle. */
  outcome: "done" | "not-possible";
  task: string;
  /** Kind of task, so each week covers something different. */
  kind: string;
  agent: string;
  workflow: string;
  result: string;
  links?: { label: string; href: string }[];
}

export const logs: AgentLog[] = [
  {
    week: 2,
    date: "2026-10-06",
    outcome: "done",
    task: "Research and build a niche-by-niche website inspiration moodboard in Figma, split into page sections",
    kind: "Research & curation",
    agent: "Claude Code (Claude Opus 5.5) with Claude in Chrome, Playwright and the Figma Plugin API",
    workflow: `Prompts, in order:
1. "Think yourself as a professional UI/UX designer. Research various websites, take inspiration from their designs and create a moodboard in Figma [link]. Attach screenshots of individual sections and organise them. I need every niche separately with multiple inspirations."
2. "Pick the best and latest UI designs. Filter out what looks bad."
3. "Make sure every section is available: reviews, pricing, footer, hero banner, nav bar."
4. "There should be more niches, every niche should include lots of website sections, and every section should have multiple inspirations."

Workflow the agent ran:
1. Pulled 2025–2026 Awwwards Sites of the Day, Honorable Mentions and Nominees for 11 niches and built one award board per niche straight into Figma through the Plugin API (no manual drag-and-drop).
2. After feedback, dropped weak and duplicate shots and switched to award winners only.
3. Wrote a Playwright capture script for about 140 leading sites across 21 niches: full-page screenshots, automatic split into sections, a first-pass label per section (nav, hero, logos, features, reviews, pricing, FAQ, blog, contact, CTA, footer…), removal of cookie banners and pop-ups, plus extra About / Blog / Contact page passes.
4. Built contact sheets so every section could be reviewed and hand-picked, then uploaded the picks into Figma as labelled "Page Sections" boards with one row per section type.`,
    result:
      "Finished moodboard in Figma with 23 named pages: a cover and index, 11 award-winner boards (153 references) and one page per niche for 21 niches, with 1,361 hand-picked section screenshots, each labelled by site and section type (1,514 references in total). Doing this by hand (finding, screenshotting, cropping and labelling 1,500+ sections) would have taken well over a week.",
  },
  {
    week: 1,
    date: "2026-10-02",
    outcome: "done",
    task: "Set up, build, test and deploy the component gallery with the first two components",
    kind: "Code generation + deployment",
    agent: "Claude Code (Claude Opus 5.5) in the Claude desktop app",
    workflow: `Prompt: I pasted the full 90 Day Build Challenge brief (Track A + Track B rules and the tech stack requirements) and wrote: "understand this and start working on this".

What the agent did, step by step:
1. Read the brief and turned it into a plan: Next.js + TypeScript + Tailwind gallery, one route per component, live preview + code + props + prompt on each page, 30-component roadmap with no repeated types per pair.
2. Scaffolded Next.js 16 and read the bundled Next 16 docs first (params are now a Promise, PageProps helper).
3. Built two components (Magnetic Button, Testimonial Marquee) with typed props and all UI states.
4. Built the site: registry, preview with Desktop/Tablet/Mobile widths, Shiki code blocks, accessible tabs, props table.
5. Wrote a Playwright suite: Chromium, Firefox and WebKit, light and dark, 375/768/1280 px overflow checks and an axe accessibility scan. It caught low-contrast code colours, which the agent fixed.
6. Created the public GitHub repo, pushed, imported it into Vercel and deployed.`,
    result:
      "A live gallery with 2 components, each on its own page, passing 18/18 cross-browser tests with 0 accessibility violations. About 4–5 hours of setup and boilerplate done in one session; I only had to approve the GitHub and Vercel logins.",
    links: [
      { label: "Live site", href: "https://lofi-component-lab.vercel.app" },
      { label: "Repo", href: "https://github.com/EsamAhmed1/lofi-component-lab" },
    ],
  },
];
