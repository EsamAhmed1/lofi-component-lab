import type { Metadata } from "next";
import { logs } from "@/registry/logs";

export const metadata: Metadata = {
  title: "Agent logs",
  description: "Track B: one task a week completed with an AI agent, with the prompt or workflow and the result.",
};

export default function LogsPage() {
  const sorted = [...logs].sort((a, b) => b.week - a.week);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-sm font-medium text-accent">Track B</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Agent logs</h1>
      <p className="mt-3 text-muted">
        One task a week done with an AI agent: what the task was, which agent, the prompt or workflow,
        and the result. Each week is a different kind of task.
      </p>

      <ol className="mt-10 space-y-8">
        {sorted.map((log) => (
          <li key={log.week}>
            <article
              aria-labelledby={`log-${log.week}`}
              className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-accent/12 px-2.5 py-1 font-medium text-accent">
                  Week {String(log.week).padStart(2, "0")}
                </span>
                <span className="rounded-full border border-border px-2.5 py-1 text-muted">{log.kind}</span>
                <span className="rounded-full border border-border px-2.5 py-1 text-muted">
                  {log.outcome === "done" ? "Done by agent" : "Could not be automated"}
                </span>
                <time dateTime={log.date} className="text-muted">
                  {log.date}
                </time>
              </div>
              <h2 id={`log-${log.week}`} className="mt-4 text-lg font-semibold tracking-tight">
                {log.task}
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-medium">Agent</dt>
                  <dd className="mt-1 text-muted">{log.agent}</dd>
                </div>
                <div>
                  <dt className="font-medium">Prompt or workflow</dt>
                  <dd className="mt-1 whitespace-pre-line rounded-xl bg-surface-2 p-4 leading-relaxed text-muted">
                    {log.workflow}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Result</dt>
                  <dd className="mt-1 text-muted">{log.result}</dd>
                </div>
              </dl>
              {log.links?.length ? (
                <ul className="mt-5 flex flex-wrap gap-3 text-sm">
                  {log.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
