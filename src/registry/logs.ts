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
