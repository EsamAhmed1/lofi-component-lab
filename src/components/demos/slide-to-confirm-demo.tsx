"use client";

import { useEffect, useRef, useState } from "react";
import { SlideToConfirm } from "@/components/ui/slide-to-confirm";

function Trash() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Rocket() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11.5 3.5c2.5 0 5 2.5 5 5l-6 6-5-5 6-6zM5.5 9.5l-2 1 2.5 1M10.5 14.5l-1 2-1-2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12.5" cy="7.5" r="1.2" />
    </svg>
  );
}

export default function SlideToConfirmDemo() {
  const [log, setLog] = useState<Array<{ id: number; text: string }>>([]);
  const nextId = useRef(0);
  const attempts = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const add = (text: string) => {
    nextId.current += 1;
    const entry = { id: nextId.current, text };
    setLog((prev) => [entry, ...prev].slice(0, 5));
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(window.setTimeout(resolve, ms));
    });

  const pay = async () => {
    add("Payment started: $49.00 to Acme Cloud");
    await wait(1400);
    add("Payment of $49.00 approved");
  };

  const remove = async () => {
    attempts.current += 1;
    add(`Delete request #${attempts.current} sent`);
    await wait(1200);
    if (attempts.current === 1) {
      add("Delete failed: the server timed out");
      throw new Error("timeout");
    }
    add("Account scheduled for deletion");
  };

  const deploy = async () => {
    add("Deploy to production started");
    await wait(1000);
    add("Deployed v2.14.0 to production");
  };

  return (
    <div className="grid w-full max-w-3xl gap-8 py-6 md:grid-cols-[1fr_minmax(0,15rem)]">
      <div className="flex flex-col items-center gap-7">
        <div className="flex w-full flex-col items-center gap-2">
          <SlideToConfirm
            label="Slide to pay $49.00"
            confirmLabel="Processing payment…"
            successLabel="Paid $49.00"
            onConfirm={pay}
            resetAfter={2600}
          />
          <p className="text-xs text-muted">Pro plan, monthly. Visa ending 4242.</p>
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <SlideToConfirm
            variant="danger"
            label="Slide to delete account"
            confirmLabel="Deleting…"
            successLabel="Account deleted"
            errorLabel="Delete failed. Slide to retry."
            icon={<Trash />}
            onConfirm={remove}
            resetAfter={3000}
          />
          <p className="text-xs text-muted">The first try fails on purpose so you can see the error state.</p>
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <SlideToConfirm
            variant="success"
            label="Slide to deploy"
            confirmLabel="Deploying…"
            successLabel="Live on production"
            icon={<Rocket />}
            onConfirm={deploy}
            resetAfter={2600}
          />
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <SlideToConfirm label="Slide to submit order" disabled />
          <p className="text-xs text-muted">Add a delivery address to continue.</p>
        </div>
      </div>

      <section aria-label="Event log" className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Event log</h3>
        {log.length ? (
          <ol className="mt-3 flex flex-col gap-2 text-sm text-foreground">
            {log.map((entry, i) => (
              <li key={entry.id} className={i === 0 ? "font-medium" : "text-muted"}>
                {entry.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted">Slide one of the controls. Keyboard: Tab to it, then press End or Enter.</p>
        )}
      </section>
    </div>
  );
}
