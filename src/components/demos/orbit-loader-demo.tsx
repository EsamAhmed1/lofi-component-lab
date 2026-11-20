"use client";

import { useEffect, useId, useState } from "react";
import { OrbitLoader, type OrbitLoaderStatus } from "@/components/ui/orbit-loader";

const STEPS = ["Install packages", "Build pages", "Optimize images", "Go live"];
// Progress added per tick in each step, so the build step feels slower.
const RATES = [1.6, 0.8, 1.2, 2];
const TICK_MS = 90;

const button =
  "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-[background-color,opacity,scale] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

function DeployPipeline() {
  const headingId = useId();
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const done = progress >= 100;
  const running = started && !failed && !done;
  const step = Math.min(STEPS.length - 1, Math.floor(progress / (100 / STEPS.length)));

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const current = Math.min(STEPS.length - 1, Math.floor(p / (100 / STEPS.length)));
        return Math.min(100, p + RATES[current]);
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const status: OrbitLoaderStatus = failed ? "error" : done ? "success" : started ? "loading" : "idle";

  const start = () => {
    setProgress(0);
    setFailed(false);
    setStarted(true);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-full flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="min-w-0 text-left">
          <h3 id={headingId} className="text-sm font-semibold text-foreground">
            Production deploy
          </h3>
          <p className="truncate text-xs text-muted">main · commit 8f3c2a1</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
          {status === "idle" ? "Queued" : status === "loading" ? "Running" : status === "success" ? "Live" : "Failed"}
        </span>
      </div>

      <OrbitLoader
        size="lg"
        label={status === "idle" ? "Ready to deploy" : "Deploying your site"}
        progress={progress}
        steps={STEPS}
        currentStep={step}
        status={status}
        successText="Your site is live."
        errorText={`Failed at "${STEPS[step]}". Check the logs and try again.`}
      />

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={start} className={`${button} bg-accent text-accent-foreground hover:opacity-90`}>
          {started ? "Restart" : "Start deploy"}
        </button>
        <button
          type="button"
          onClick={() => setFailed(true)}
          disabled={!running}
          className={`${button} border border-border bg-surface text-foreground hover:bg-surface-2`}
        >
          Simulate error
        </button>
      </div>
    </section>
  );
}

export default function OrbitLoaderDemo() {
  const galleryId = useId();
  return (
    <div className="@container w-full py-4">
      <div className="grid w-full gap-6 @3xl:grid-cols-[1.15fr_1fr]">
        <DeployPipeline />

        <section
          aria-labelledby={galleryId}
          className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <h3 id={galleryId} className="text-left text-sm font-semibold text-foreground">
            Sizes and states
          </h3>
          <div className="grid grid-cols-2 items-end justify-items-center gap-x-4 gap-y-6 @md:grid-cols-3">
            <OrbitLoader size="sm" label="Saving" />
            <OrbitLoader size={64} label="Uploading" accent="#0284c7" speed={1.6} />
            <OrbitLoader size="md" label="Indexing" accent="#d97706" speed={0.6} />
            <OrbitLoader size="md" label="Backing up" progress={72} accent="#7c3aed" />
            <OrbitLoader size="sm" label="Saving draft" status="success" successText="Saved" />
            <OrbitLoader size="sm" label="Uploading photo" status="error" errorText="Upload failed" />
          </div>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1.5 pl-2 pr-3.5 text-sm text-foreground">
              <OrbitLoader size={22} label="Publishing post" hideLabel />
              Publishing post
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
