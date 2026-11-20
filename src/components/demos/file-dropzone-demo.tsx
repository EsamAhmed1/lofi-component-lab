"use client";

import { useId, useRef, useState } from "react";
import { FileDropzone, type DropzoneFile, type FileDropzoneHandle, type UploadFn } from "@/components/ui/file-dropzone";
import { cn } from "@/lib/cn";

const MB = 1024 * 1024;

/** A pretend upload: timers drive the progress, the signal stops it, and "corrupt-*" files always fail. */
const fakeUpload: UploadFn = (file, onProgress, signal) =>
  new Promise<void>((resolve, reject) => {
    const fails = file.name.toLowerCase().startsWith("corrupt");
    const duration = Math.min(4500, 1100 + file.size / 800);
    const startedAt = performance.now();
    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      stop();
      reject(new DOMException("Upload cancelled.", "AbortError"));
    };
    const tick = () => {
      const p = Math.min(1, (performance.now() - startedAt) / duration);
      if (fails && p > 0.55) {
        stop();
        reject(new Error("The server rejected the file. It may be damaged."));
        return;
      }
      onProgress(p);
      if (p >= 1) {
        stop();
        resolve();
        return;
      }
      timer = window.setTimeout(tick, 90 + Math.random() * 140);
    };
    if (signal.aborted) {
      reject(new DOMException("Upload cancelled.", "AbortError"));
      return;
    }
    signal.addEventListener("abort", onAbort);
    timer = window.setTimeout(tick, 150);
  });

function canvasImage(name: string, colors: [string, string], label: string) {
  return new Promise<File | null>((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve(null);
    const gradient = ctx.createLinearGradient(0, 0, 640, 420);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 420);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(470, 120, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px system-ui, sans-serif";
    ctx.fillText(label, 48, 360);
    canvas.toBlob((blob) => resolve(blob ? new File([blob], name, { type: "image/png" }) : null), "image/png");
  });
}

async function sampleFiles() {
  const hero = await canvasImage("hero-gradient.png", ["#7c3aed", "#ec4899"], "Spring launch");
  const broken = await canvasImage("corrupt-export.png", ["#0f172a", "#334155"], "Export v3");
  const logo = new File(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#111827"/><circle cx="32" cy="32" r="14" fill="#a78bfa"/></svg>`,
    ],
    "logo-mark.svg",
    { type: "image/svg+xml" },
  );
  const guidelines = new File([new Uint8Array(Math.round(2.4 * MB))], "brand-guidelines.pdf", { type: "application/pdf" });
  const fonts = new File([new Uint8Array(Math.round(0.8 * MB))], "font-licenses.zip", { type: "application/zip" });
  const video = new File([new Uint8Array(4096)], "promo-cut.mov", { type: "video/quicktime" });
  const raw = new File([new Uint8Array(Math.round(14 * MB))], "photoshoot-raw.png", { type: "image/png" });
  return [hero, logo, guidelines, broken, fonts, video, raw].filter((f): f is File => f !== null);
}

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring";

export default function FileDropzoneDemo() {
  const dropzone = useRef<FileDropzoneHandle>(null);
  const [files, setFiles] = useState<DropzoneFile[]>([]);
  const [locked, setLocked] = useState(false);
  const [saved, setSaved] = useState("");
  const [adding, setAdding] = useState(false);
  const hintId = useId();
  const nameId = useId();

  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const failed = files.some((f) => f.status === "error");
  const hint = !files.length
    ? "Add at least one file to save."
    : failed
      ? "Retry or remove the failed files to save."
      : allDone
        ? "Everything is uploaded."
        : "Waiting for uploads to finish.";

  return (
    <form
      className="w-full max-w-2xl py-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!allDone) return;
        const name = new FormData(event.currentTarget).get("project");
        setSaved(`Saved ${files.length} ${files.length === 1 ? "asset" : "assets"} to ${String(name || "your project")}.`);
      }}
    >
      <h2 className="text-lg font-semibold">Upload project assets</h2>
      <p className="mt-1 text-sm text-muted">
        Uploads are simulated, so files never leave the browser. Any file whose name starts with &quot;corrupt&quot; always fails.
      </p>

      <label htmlFor={nameId} className="mt-5 block text-sm font-medium">
        Project name
      </label>
      <input
        id={nameId}
        name="project"
        defaultValue="Spring launch"
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-ring"
      />

      <FileDropzone
        ref={dropzone}
        className="mt-5"
        accept="image/*,.pdf,.zip"
        acceptLabel="Images, PDF or ZIP"
        maxSize={10 * MB}
        maxFiles={8}
        upload={fakeUpload}
        onFilesChange={(next) => {
          setFiles(next);
          setSaved("");
        }}
        disabled={locked}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={adding || locked}
          onClick={async () => {
            setAdding(true);
            const list = await sampleFiles();
            dropzone.current?.addFiles(list);
            setAdding(false);
          }}
          className={cn(
            "h-11 rounded-xl border border-border bg-surface px-4 text-sm font-medium transition-[background-color,scale] hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
            ring,
          )}
        >
          {adding ? "Adding…" : "Add sample files"}
        </button>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} className={cn("size-4 accent-(--accent)", ring)} />
          Disable dropzone
        </label>
        <button
          type="submit"
          disabled={!allDone}
          aria-describedby={hintId}
          className={cn(
            "ml-auto h-11 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-[opacity,scale] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
            ring,
          )}
        >
          Save assets
        </button>
      </div>
      <p id={hintId} className="mt-2 text-right text-xs text-muted">
        {hint}
      </p>
      <p role="status" className="mt-2 text-sm font-medium text-emerald-700 empty:hidden dark:text-emerald-300">
        {saved}
      </p>
    </form>
  );
}
