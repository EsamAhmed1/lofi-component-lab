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
  /** Shorter "Prompt or workflow" text for the Discord post (falls back to workflow). */
  post?: string;
  links?: { label: string; href: string }[];
}

export const logs: AgentLog[] = [
  {
    week: 9,
    date: "2026-11-20",
    outcome: "done",
    task: "Visual QA of all 14 new components: light and dark, desktop and mobile, plus their open and pressed states",
    kind: "Visual QA",
    agent: "Claude Code (Claude Opus 5.5) with Playwright",
    workflow: `Prompt: part of "...give me everything submission ready" for weeks 3 to 9. The agent was told to check its own work visually before shipping.

Workflow:
1. The plan was to review the pages in my real Chrome profile through Claude in Chrome. The window was minimised, so screenshots timed out (the page reported a width of 0). The agent switched to headless Playwright instead of stopping.
2. A script took 56 screenshots of every component preview: light and dark, 1280 px and 375 px.
3. A second script drove the interactive states and screenshotted them: the open morph modal (desktop and phone sheet), the island navbar's mega menu, notifications and mobile panel, the owl covering its eyes, the like burst mid-animation, the slider part-way, and the deploy loader running.
4. The agent read every image and listed what looked wrong.
5. It fixed the two layout bugs it found, rebuilt and re-shot the same views to confirm.`,
    post: `Workflow: 1) Planned to review in my Chrome via Claude in Chrome; the window was minimised so screenshots timed out, so the agent switched to headless Playwright. 2) Script took 56 screenshots of every new component (light/dark, 1280 and 375 px). 3) Second script drove open/pressed states (modal open, navbar panels, owl covering eyes, like burst, slider, running loader) and screenshotted them. 4) Agent read every image, fixed what was wrong, rebuilt and re-shot to confirm.`,
    result:
      "Found 2 bugs no test caught: the pricing table pushed its 4th plan off-screen on desktop and squeezed 4 columns on phones, and the heatmap's weekday labels showed as white blocks over the cells. Both fixed and re-checked. The other 12 components looked right in every view.",
  },
  {
    week: 8,
    date: "2026-11-20",
    outcome: "done",
    task: "Write a script that builds the weekly Discord posts from the gallery's registry and checks the 2,000-character limit",
    kind: "Workflow automation",
    agent: "Claude Code (Claude Opus 5.5)",
    workflow: `Prompt: "after everything is ready, give me each week submission separately", with two screenshots of a teammate's posts as the format.

Workflow:
1. The agent copied the format from the screenshots: the challenge header, gallery link, Week, Type, Component name, Live link, Repo link, the prompt and @LofiDB.
2. It wrote scripts/submissions.mjs. It reads the per-week registry files and the agent logs, builds one post per component plus the agent log, and writes submissions/week-NN.md.
3. Every post is measured. The script exits with an error if any post is over 2,000 characters.
4. A dry run on week 2 caught the old agent log at 2,197 characters. So logs got an optional shorter "post" field for Discord, while the site keeps the full write-up.
5. It generated the posts for weeks 3 to 9.`,
    post: `Workflow: 1) Copied the post format from a teammate's screenshots. 2) Agent wrote scripts/submissions.mjs: reads the per-week registry + agent logs, builds one post per component and per log, writes submissions/week-NN.md. 3) Measures every post and fails if one is over Discord's 2,000-character limit. 4) Dry run on week 2 caught an agent log at 2,197 chars, so logs got a short "post" field for Discord. 5) Generated weeks 3 to 9.`,
    result:
      "21 posts for weeks 3 to 9 generated in one command, all under 2,000 characters, with links that always match the live pages. Before this, each post was put together and counted by hand.",
  },
  {
    week: 7,
    date: "2026-11-20",
    outcome: "done",
    task: "Accessibility audit of the 14 new components: axe in 3 browsers and 2 colour schemes, plus a keyboard-only walk-through",
    kind: "Accessibility audit",
    agent: "Claude Code (Claude Opus 5.5) with Playwright and axe-core",
    workflow: `Prompt: part of the weeks 3 to 9 build. The brief requires every component to be accessible.

Workflow:
1. The axe WCAG 2.1 AA scan ran on every page in Chromium, Firefox and WebKit, in light and dark mode.
2. axe can't judge everything, so the agent wrote a keyboard audit script. It tabs through each component's preview and records every tab stop, its accessible name and whether a focus style is actually drawn.
3. Three components reported no visible focus: Holo Foil Card, Dial Knob and Island Navbar. The agent checked the computed style. The classes said outline-2 but outline-style was "none". In Tailwind v4, outline-none sets the style variable to none and focus-visible:outline-2 only changes the width.
4. It added focus-visible:outline-solid, rebuilt and re-ran the audit and the full suite.`,
    post: `Workflow: 1) axe WCAG 2.1 AA scan on every page in Chromium, Firefox and WebKit, light and dark. 2) Agent wrote a keyboard audit script: tabs through each preview and records every stop, its accessible name and whether a focus style is really drawn. 3) Holo Card, Dial Knob and Island Navbar showed no focus ring. Computed style showed outline-style "none": in Tailwind v4, outline-none + focus-visible:outline-2 only sets the width. 4) Added focus-visible:outline-solid, re-ran the audit and the suite.`,
    result:
      "0 axe violations on all 21 pages in 6 browser/scheme combinations. The keyboard audit found a real bug axe missed, missing focus rings on 3 components (13 controls), now fixed. Every tab stop on the 14 components has a name and a visible ring.",
  },
  {
    week: 6,
    date: "2026-11-20",
    outcome: "done",
    task: "Run the cross-browser test suite on the 14 new components and fix what fails",
    kind: "Debugging",
    agent: "Claude Code (Claude Opus 5.5) with Playwright",
    workflow: `Prompt: part of the weeks 3 to 9 build. Every component has to pass the suite before it ships.

Workflow:
1. The old suite tested every component page inside one test. With 18 components that test would run past Playwright's timeout, so the agent changed it to one test per component.
2. The new test found 0 components. The agent traced it to its own edit: writing the file from a script turned the regex \\b into a backspace character. It rewrote the line with String.raw and got 108 tests.
3. First full run: 135 passed, 31 failed. The errors were "browser has been closed", "worker process exited" and "JavaScript heap out of memory", not component bugs. 4 parallel browsers ran the machine out of memory.
4. Workers went from 4 to 2 in playwright.config.ts, with a comment saying why.`,
    post: `Workflow: 1) Old suite tested all component pages inside one test, which would time out at 18 components. Agent split it into one test per component. 2) New test found 0 components; agent traced it to its own edit (a script turned the regex \\b into a backspace char) and fixed it: 108 tests. 3) First full run: 135 passed, 31 failed with "browser closed", "worker exited" and "heap out of memory", not component bugs. 4) Cut workers from 4 to 2 and re-ran.`,
    result:
      "166 passed, 2 skipped (a Firefox paste test, skipped on purpose), 0 failed across Chromium, Firefox and WebKit in light and dark. A later run hit one WebKit crash during an axe scan, so the suite now retries a test once and the quality report keeps only the final attempt. Telling crashes apart from real bugs saved chasing 31 false alarms.",
  },
  {
    week: 5,
    date: "2026-11-20",
    outcome: "done",
    task: "Build 14 components at once with 7 sub-agents working in parallel, one per challenge week",
    kind: "Multi-agent orchestration",
    agent: "Claude Code (Claude Opus 5.5) as orchestrator, with 7 Claude Opus 5.5 sub-agents",
    workflow: `Prompt: "I need for week 3, 4, 5, 6, 7, 8, 9 sequentially for submission... try to build the most unique and eye-catchy things."

Workflow:
1. The orchestrator wrote one shared brief that every sub-agent read first. It set the rules:
   - One self-contained file per component and no new dependencies.
   - Typed props and keyframes inside the component.
   - WCAG AA in light and dark, and reduced motion.
   - No Math.random or Date during render, to avoid hydration errors.
   - A build prompt of 1,500 characters or less.
   - Never run the build, because the agents share one .next folder.
2. It launched 7 sub-agents in parallel. Each got a detailed spec for its week's two components and owned only its own files.
3. Each agent type-checked and linted its own files and returned a list of risks to check visually.
4. The orchestrator wired the 7 week files into the registry, ran the build and the full suite, and reviewed screenshots.`,
    post: `Workflow: 1) Orchestrator wrote one shared brief: one self-contained file per component, no dependencies, typed props, WCAG AA in light/dark, reduced motion, no random values during render, prompt under 1,500 chars, never run the build (shared .next). 2) Launched 7 sub-agents in parallel, one per week, each with a detailed spec for 2 components and its own files. 3) Each agent type-checked, linted and returned risks to check. 4) Orchestrator wired the registry, built, ran the suite and reviewed screenshots.`,
    result:
      "14 components (8,184 lines plus 1,899 lines of demos) built in about 18 minutes of wall time. All 14 type-checked and built on the first integration with no merge conflicts. The same agents run one after another would have needed about 1.5 hours.",
  },
  {
    week: 4,
    date: "2026-11-20",
    outcome: "done",
    task: "Refactor the component registry into one file per week so several agents can add components at the same time",
    kind: "Refactoring",
    agent: "Claude Code (Claude Opus 5.5)",
    workflow: `Prompt: part of the weeks 3 to 9 build. 14 components were going to be added by parallel agents.

Workflow:
1. The agent saw that every component lived in one 293-line src/registry/index.ts. Seven agents writing to it at once would overwrite each other.
2. It moved the types to src/registry/types.ts and each week's entries to src/registry/weeks/week-NN.ts. index.ts now only joins the weeks in order and exports getEntry.
3. It did the split with a small node script that cut the file at known line ranges, not by retyping the entries, so no prompt or note text could change.
4. It checked that nothing broke: tsc clean, and the build output listed the same routes as before.
5. It also changed the test suite and the new post script to read the week files.`,
    post: `Workflow: 1) Agent saw every component lived in one 293-line registry file; 7 parallel agents writing to it would overwrite each other. 2) Moved the types to types.ts and each week's entries to weeks/week-NN.ts; index.ts just joins them. 3) Did the split with a node script that cut at line ranges, so no prompt or note text could change. 4) Checked tsc and that the build listed the same routes. 5) Pointed the tests and the post script at the week files.`,
    result:
      "No change to the live site, and each week is now its own file. It is what let 7 agents add 14 components in parallel without a single conflict, and it keeps future weeks to one new file.",
  },
  {
    week: 3,
    date: "2026-11-20",
    outcome: "done",
    task: "Study 10 component libraries in the browser and turn them into a plan for 14 unique components",
    kind: "Competitive research & planning",
    agent: "Claude Code (Claude Opus 5.5) with Claude in Chrome",
    workflow: `Prompt: "I have provided you some referenceable links [Uiverse, Magic UI, Animate UI, Watermelon UI, Cult UI, Skiper UI, Vengeance UI, Uilora, ForgeUI Illustrations, Layers]... take inspiration... build the most unique and eye-catchy things for the submission."

Workflow:
1. The agent opened each library in my Chrome profile and pulled each site's component list with a short script, instead of scrolling by hand. Magic UI alone listed about 70 components, and Uiverse showed 7,471 elements.
2. Skiper UI froze the tab, with the renderer unresponsive for 45 seconds, so it was skipped and noted.
3. It picked ideas that recur across the strongest libraries: dock, aurora, foil cards, orbit loaders, a dynamic island and border beams.
4. It checked them against my 4 shipped components and a teammate's posts (Mood Emoji, Study Routine) so nothing repeats.
5. It gave each week two different types and rewrote ROADMAP.md, moving the old plan to December and removing near-duplicates.`,
    post: `Workflow: 1) Agent opened each library in my Chrome and pulled its component list with a short script instead of scrolling (Magic UI ~70 components, Uiverse 7,471 elements). 2) Skiper UI froze the tab, so it was skipped and noted. 3) Picked ideas that recur across the best libraries (dock, aurora, foil cards, orbit loaders, dynamic island, border beams). 4) Checked against my 4 shipped components and teammates' posts so nothing repeats. 5) Two different types per week; rewrote ROADMAP.md.`,
    result:
      "A 14-component plan for weeks 3 to 9, each inspired by a named library, with no repeats and no repeated type within a week. The roadmap for weeks 10 to 13 was updated so the 30 components stay unique. Hours of manual browsing done in a few minutes.",
  },
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
