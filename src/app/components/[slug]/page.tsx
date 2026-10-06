import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntry, registry } from "@/registry";
import { CodeBlock } from "@/components/site/code-block";
import { PreviewFrame } from "@/components/site/preview-frame";
import { Tabs } from "@/components/site/tabs";
import quality from "@/registry/quality.json";

const BROWSERS = [
  { id: "chromium", label: "Chromium" },
  { id: "firefox", label: "Firefox" },
  { id: "webkit", label: "WebKit" },
];

export const dynamicParams = false;

export function generateStaticParams() {
  return registry.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata(props: PageProps<"/components/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const entry = getEntry(slug);
  if (!entry) return {};
  return { title: entry.name, description: entry.summary };
}

export default async function ComponentPage(props: PageProps<"/components/[slug]">) {
  const { slug } = await props.params;
  const entry = getEntry(slug);
  if (!entry) notFound();

  const fileName = path.basename(entry.source);
  const source = await readFile(path.join(process.cwd(), "src", "components", "ui", fileName), "utf8");
  const index = registry.findIndex((e) => e.slug === entry.slug);
  const prev = registry[index - 1];
  const next = registry[index + 1];
  const { Demo } = entry;
  const pages = quality.pages as Record<string, { passed: string[]; failed: string[] } | undefined>;
  const checks = pages[`/components/${entry.slug}`];
  const testedOn = (quality as { generatedOn?: string }).generatedOn ?? null;

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/components" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              Components
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {entry.name}
          </li>
        </ol>
      </nav>

      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-accent/12 px-2.5 py-1 font-medium text-accent">{entry.kind}</span>
          <span className="rounded-full border border-border px-2.5 py-1 text-muted">
            Week {String(entry.week).padStart(2, "0")}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-muted">
            Added <time dateTime={entry.added}>{entry.added}</time>
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{entry.name}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted text-pretty">{entry.summary}</p>
      </header>

      <div className="mt-8">
        <PreviewFrame>
          <Demo />
        </PreviewFrame>
        <ul aria-label="Handled states" className="mt-3 flex flex-wrap gap-2">
          {entry.states.map((state) => (
            <li key={state} className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">
              {state}
            </li>
          ))}
        </ul>
      </div>

      <section aria-labelledby="quality-heading" className="mt-12">
        <h2 id="quality-heading" className="mb-4 text-xl font-semibold tracking-tight">
          Quality checks
        </h2>
        {checks ? (
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <ul className="grid gap-2 sm:grid-cols-3">
              {BROWSERS.map((browser) =>
                ["light", "dark"].map((scheme) => {
                  const project = `${browser.id}-${scheme}`;
                  const ok = checks.passed.includes(project);
                  return (
                    <li key={project} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                      <span aria-hidden className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}>
                        {ok ? "✓" : "✕"}
                      </span>
                      <span>
                        {browser.label} · {scheme}
                        <span className="sr-only">{ok ? " passed" : " failed"}</span>
                      </span>
                    </li>
                  );
                }),
              )}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Each run loads the page at 375, 768 and 1280 px (no horizontal overflow), fails on any console
              error and runs an axe WCAG 2.1 AA scan. Accessibility violations across all runs:{" "}
              <strong className="text-foreground">{quality.axeViolations}</strong>
              {testedOn ? (
                <>
                  {" "}· last run <time dateTime={testedOn}>{testedOn}</time>
                </>
              ) : null}
              .
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Not tested yet.</p>
        )}
      </section>

      <section aria-labelledby="code-heading" className="mt-12">
        <h2 id="code-heading" className="mb-4 text-xl font-semibold tracking-tight">
          Code
        </h2>
        <Tabs
          label="Code views"
          items={[
            { id: "usage", label: "Usage", content: <CodeBlock code={entry.usage} label="Usage example" /> },
            {
              id: "source",
              label: fileName,
              content: <CodeBlock code={source} label="Component source" />,
            },
          ]}
        />
      </section>

      <section aria-labelledby="props-heading" className="mt-12">
        <h2 id="props-heading" className="mb-4 text-xl font-semibold tracking-tight">
          Props
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Prop</th>
                <th scope="col" className="px-4 py-3 font-medium">Type</th>
                <th scope="col" className="px-4 py-3 font-medium">Default</th>
                <th scope="col" className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {entry.props.map((prop) => (
                <tr key={prop.name}>
                  <td className="px-4 py-3 font-mono text-[13px] font-medium">{prop.name}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-accent">{prop.type}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted">{prop.default ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="prompt-heading" className="mt-12">
        <h2 id="prompt-heading" className="mb-1 text-xl font-semibold tracking-tight">
          Build prompt
        </h2>
        <p className="mb-4 text-sm text-muted">The final prompt used to generate this component.</p>
        <CodeBlock code={entry.prompt} lang="md" label="Build prompt" />
      </section>

      <section aria-labelledby="notes-heading" className="mt-12">
        <h2 id="notes-heading" className="mb-1 text-xl font-semibold tracking-tight">
          Build notes
        </h2>
        <p className="mb-4 text-sm text-muted">Problems found while building and testing it, how they were fixed, and the decisions that shaped it.</p>
        <ul className="space-y-2">
          {entry.notes.map((note) => (
            <li key={note} className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
              {note}
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="More components" className="mt-14 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/components/${prev.slug}`}
            className="rounded-xl border border-border p-4 hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="text-xs text-muted">← Previous</span>
            <span className="mt-1 block font-medium">{prev.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/components/${next.slug}`}
            className="rounded-xl border border-border p-4 text-right hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="text-xs text-muted">Next →</span>
            <span className="mt-1 block font-medium">{next.name}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
