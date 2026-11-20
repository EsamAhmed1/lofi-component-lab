"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export type UploadStatus = "queued" | "uploading" | "done" | "error";

/**
 * Uploads one file. Call onProgress with a fraction from 0 to 1. Resolve when
 * done, reject with an Error to show its message, and stop when the signal aborts.
 */
export type UploadFn = (file: File, onProgress: (fraction: number) => void, signal: AbortSignal) => Promise<void>;

export interface DropzoneFile {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0 to 1. */
  progress: number;
  error?: string;
  /** Object URL for image thumbnails. Revoked on remove and unmount. */
  previewUrl?: string;
}

export interface FileDropzoneHandle {
  /** Adds files as if they were dropped. They go through the same checks. */
  addFiles: (files: File[] | FileList) => void;
  /** Cancels every upload and empties the list. */
  clear: () => void;
}

export interface FileDropzoneProps {
  /** Same syntax as the input accept attribute: ".pdf,image/*,application/zip". */
  accept?: string;
  /** Human list of accepted types for messages. Worked out from accept by default. */
  acceptLabel?: string;
  /** Largest file in bytes. */
  maxSize?: number;
  /** Most files in the list. */
  maxFiles?: number;
  /** When false, one file at a time; a new file replaces the old one. */
  multiple?: boolean;
  /** Uploads a file. Without it, accepted files are marked done straight away. */
  upload?: UploadFn;
  /** How many uploads run at once. */
  concurrency?: number;
  /** Called with the full list after every change. */
  onFilesChange?: (files: DropzoneFile[]) => void;
  disabled?: boolean;
  /** Main line in the drop area. */
  label?: string;
  /** Instructions under the label. Built from accept, maxSize and maxFiles by default. */
  description?: string;
  className?: string;
  ref?: Ref<FileDropzoneHandle>;
}

const CSS = `
@keyframes file-dropzone-march { to { stroke-dashoffset: -30; } }
@keyframes file-dropzone-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  40% { transform: translateY(-9px) scale(1.04); }
  70% { transform: translateY(2px) scale(0.98); }
}
@keyframes file-dropzone-sheen { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
.file-dropzone-march { animation: file-dropzone-march 0.7s linear infinite; }
.file-dropzone-bounce { animation: file-dropzone-bounce 0.9s cubic-bezier(0.3, 0.7, 0.4, 1) infinite; }
.file-dropzone-sheen { animation: file-dropzone-sheen 1.3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .file-dropzone-march, .file-dropzone-bounce, .file-dropzone-sheen { animation: none; }
}
`;

/* ------------------------------------------------------------- helpers */

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const shown = value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");
  return `${shown} ${units[i]}`;
}

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .some((t) => (t.startsWith(".") ? name.endsWith(t) : t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t));
}

const listOf = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;

function describeAccept(accept?: string) {
  if (!accept) return "Any file";
  const names = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => {
      if (t === "image/*") return "images";
      if (t === "video/*") return "videos";
      if (t === "audio/*") return "audio";
      if (t.startsWith(".")) return t.slice(1).toUpperCase();
      const sub = t.split("/")[1] ?? t;
      return sub.replace(/^x-/, "").toUpperCase();
    });
  const unique = names.filter((n, i) => names.indexOf(n) === i);
  const text = listOf(unique);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Kind = "image" | "pdf" | "video" | "audio" | "archive" | "doc" | "other";

function kindOf(file: File): Kind {
  const type = file.type;
  const ext = extensionOf(file.name);
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (/zip|rar|7z|tar|gz/.test(type) || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (type.startsWith("text/") || ["doc", "docx", "txt", "md", "rtf", "csv", "xlsx", "pptx", "key"].includes(ext)) return "doc";
  return "other";
}

const kindStyle: Record<Kind, string> = {
  image: "bg-violet-700",
  pdf: "bg-rose-700",
  video: "bg-sky-700",
  audio: "bg-amber-700",
  archive: "bg-emerald-700",
  doc: "bg-blue-700",
  other: "bg-zinc-600",
};

function TypeIcon({ file }: { file: File }) {
  const kind = kindOf(file);
  const ext = (extensionOf(file.name) || kind).slice(0, 4).toUpperCase();
  return (
    <span aria-hidden className={cn("relative grid size-full place-items-center text-white", kindStyle[kind])}>
      <svg viewBox="0 0 24 24" className="absolute right-1 top-1 size-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      <span className="mt-2 text-[10px] font-bold tracking-wide">{ext}</span>
    </span>
  );
}

const iconButton =
  "grid size-9 shrink-0 place-items-center rounded-full text-muted transition-[color,background-color,scale] hover:bg-surface-2 hover:text-foreground active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none";

/* ----------------------------------------------------------- component */

/**
 * A drop area for files with validation and per-file upload progress. It is a
 * real button (click, Enter or Space opens the picker), takes drops and
 * pastes, and runs uploads through your `upload` function with an AbortSignal.
 */
export function FileDropzone({
  accept,
  acceptLabel,
  maxSize,
  maxFiles,
  multiple = true,
  upload,
  concurrency = 2,
  onFilesChange,
  disabled = false,
  label = "Drop files here, or click to browse",
  description,
  className,
  ref,
}: FileDropzoneProps) {
  const [files, setFiles] = useState<DropzoneFile[]>([]);
  const [rejections, setRejections] = useState<{ id: string; name: string; reason: string }[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState<{ count: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const store = useRef({ files: [] as DropzoneFile[], controllers: new Map<string, AbortController>(), seq: 0 });
  const latest = useRef({ upload, onFilesChange, concurrency });
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const descId = `${baseId}-desc`;

  const types = acceptLabel ?? describeAccept(accept);
  const limit = multiple ? (maxFiles ?? Infinity) : 1;
  const instructions =
    description ??
    [
      `${types}${maxSize ? ` up to ${formatBytes(maxSize)} each` : ""}.`,
      multiple ? (maxFiles ? `Up to ${maxFiles} files.` : "") : "One file.",
      "You can also paste.",
    ]
      .filter(Boolean)
      .join(" ");

  useLayoutEffect(() => {
    latest.current = { upload, onFilesChange, concurrency };
  });

  // Stop uploads and free thumbnails when the component goes away.
  useEffect(() => {
    const s = store.current;
    return () => {
      for (const controller of s.controllers.values()) controller.abort();
      s.controllers.clear();
      for (const f of s.files) if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    };
  }, []);

  const announce = (message: string) => setAnnouncement((prev) => (prev === message ? `${message} ` : message));

  const commit = (next: DropzoneFile[]) => {
    store.current.files = next;
    setFiles(next);
    latest.current.onFilesChange?.(next);
  };

  const update = (id: string, patch: Partial<DropzoneFile>) =>
    commit(store.current.files.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const start = (item: DropzoneFile, run: UploadFn) => {
    const s = store.current;
    const controller = new AbortController();
    s.controllers.set(item.id, controller);
    update(item.id, { status: "uploading", progress: 0, error: undefined });
    const name = item.file.name;
    run(
      item.file,
      (fraction) => {
        if (controller.signal.aborted) return;
        update(item.id, { progress: Math.min(1, Math.max(0, fraction)) });
      },
      controller.signal,
    ).then(
      () => {
        if (controller.signal.aborted) return;
        s.controllers.delete(item.id);
        update(item.id, { status: "done", progress: 1 });
        const left = s.files.filter((f) => f.status !== "done" && f.status !== "error").length;
        announce(left ? `${name} uploaded.` : `${name} uploaded. All uploads finished.`);
        pump();
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        s.controllers.delete(item.id);
        const message = err instanceof Error && err.message ? err.message : "Upload failed.";
        update(item.id, { status: "error", error: message });
        announce(`${name} failed. ${message}`);
        pump();
      },
    );
  };

  /** Starts queued uploads until the concurrency limit is reached. */
  const pump = () => {
    const run = latest.current.upload;
    if (!run) return;
    const max = Math.max(1, latest.current.concurrency);
    let active = store.current.files.filter((f) => f.status === "uploading").length;
    for (const f of store.current.files) {
      if (active >= max) break;
      if (f.status !== "queued") continue;
      active++;
      start(f, run);
    }
  };

  const dispose = (f: DropzoneFile) => {
    store.current.controllers.get(f.id)?.abort();
    store.current.controllers.delete(f.id);
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  };

  const addFiles = (list: File[] | FileList | null | undefined) => {
    if (disabled || !list) return;
    const incoming = Array.from(list);
    if (!incoming.length) return;
    const s = store.current;
    const kept = multiple ? s.files : [];
    const accepted: DropzoneFile[] = [];
    const rejected: { id: string; name: string; reason: string }[] = [];
    for (const file of incoming) {
      const ext = extensionOf(file.name);
      let reason = "";
      if (!matchesAccept(file, accept)) reason = `${ext ? ext.toUpperCase() : "These"} files aren't accepted. Use ${types.toLowerCase()}.`;
      else if (maxSize && file.size > maxSize) reason = `It's ${formatBytes(file.size)}. The limit is ${formatBytes(maxSize)}.`;
      else if (kept.length + accepted.length >= limit) reason = multiple ? `The limit is ${limit} files.` : "Only one file at a time.";
      if (reason) {
        rejected.push({ id: `${baseId}-r${s.seq++}`, name: file.name || "Pasted file", reason });
        continue;
      }
      accepted.push({
        id: `${baseId}-f${s.seq++}`,
        file,
        status: latest.current.upload ? "queued" : "done",
        progress: latest.current.upload ? 0 : 1,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    if (accepted.length) {
      if (!multiple) for (const f of s.files) dispose(f);
      commit([...kept, ...accepted]);
      pump();
    }
    setRejections(rejected);
    const parts: string[] = [];
    if (accepted.length) parts.push(`${accepted.length} ${accepted.length === 1 ? "file" : "files"} added.`);
    if (rejected.length) parts.push(`${rejected.length} not added: ${rejected[0].name}. ${rejected[0].reason}`);
    announce(parts.join(" "));
  };

  const remove = (f: DropzoneFile) => {
    dispose(f);
    commit(store.current.files.filter((x) => x.id !== f.id));
    announce(`${f.file.name} removed.`);
    pump();
  };

  const cancel = (f: DropzoneFile) => {
    store.current.controllers.get(f.id)?.abort();
    store.current.controllers.delete(f.id);
    update(f.id, { status: "error", progress: 0, error: "Upload cancelled." });
    announce(`${f.file.name} cancelled.`);
    pump();
  };

  const retry = (f: DropzoneFile) => {
    update(f.id, { status: "queued", progress: 0, error: undefined });
    announce(`Retrying ${f.file.name}.`);
    pump();
  };

  const clear = () => {
    for (const f of store.current.files) dispose(f);
    commit([]);
    setRejections([]);
  };

  useImperativeHandle(ref, () => ({ addFiles: (list) => addFiles(list), clear }));

  const fileCount = (event: DragEvent) => {
    const items = event.dataTransfer?.items;
    if (!items) return 0;
    let n = 0;
    for (let i = 0; i < items.length; i++) if (items[i].kind === "file") n++;
    return n;
  };
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const onPaste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.files;
    if (!pasted?.length || disabled) return;
    event.preventDefault();
    const named = Array.from(pasted).map((file, i) => {
      if (file.name && file.name !== "image.png") return file;
      const ext = extensionOf(file.name) || file.type.split("/")[1] || "bin";
      return new File([file], `pasted-${store.current.seq + i + 1}.${ext}`, { type: file.type, lastModified: file.lastModified });
    });
    addFiles(named);
  };

  // Summary numbers for the overall bar.
  const live = files.filter((f) => f.status !== "error");
  const totalBytes = live.reduce((sum, f) => sum + Math.max(1, f.file.size), 0);
  const loadedBytes = live.reduce((sum, f) => sum + Math.max(1, f.file.size) * f.progress, 0);
  const overall = totalBytes ? Math.round((loadedBytes / totalBytes) * 100) : 0;
  const doneCount = files.filter((f) => f.status === "done").length;
  const failedCount = files.filter((f) => f.status === "error").length;
  const busy = files.some((f) => f.status === "uploading" || f.status === "queued");
  const headline = busy
    ? `Uploading, ${doneCount} of ${files.length} done`
    : failedCount
      ? `${doneCount} of ${files.length} uploaded, ${failedCount} failed`
      : `All ${files.length} ${files.length === 1 ? "file" : "files"} uploaded`;

  const count = dragging?.count ?? 0;

  return (
    <div className={cn("@container w-full", className)} onPaste={onPaste}>
      <style href="file-dropzone" precedence="default">
        {CSS}
      </style>
      <div
        className={cn(disabled && "cursor-not-allowed")}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!hasFiles(event)) return;
          depth.current++;
          if (!disabled) setDragging({ count: fileCount(event) });
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(null);
        }}
        onDrop={(event) => {
          event.preventDefault();
          depth.current = 0;
          setDragging(null);
          addFiles(event.dataTransfer.files);
        }}
      >
        <button
          type="button"
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={descId}
          onClick={() => inputRef.current?.click()}
          data-dragging={dragging ? "" : undefined}
          className={cn(
            "group/dz relative isolate flex min-h-52 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-surface px-6 py-9 text-center text-foreground",
            "transition-[background-color,scale,box-shadow] duration-300 ease-out hover:bg-surface-2 motion-reduce:transition-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
            "data-dragging:scale-[1.01] data-dragging:bg-surface-2 data-dragging:shadow-[0_24px_60px_-30px_var(--accent)] motion-reduce:data-dragging:scale-100",
            "disabled:pointer-events-none disabled:opacity-60",
          )}
        >
          {/* Glow behind the content while files hover over the zone. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_45%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_70%)] opacity-0 transition-opacity duration-300 group-data-dragging/dz:opacity-100 motion-reduce:transition-none"
          />
          <svg aria-hidden className="pointer-events-none absolute inset-px size-[calc(100%-2px)] overflow-visible">
            <rect
              width="100%"
              height="100%"
              rx="23"
              ry="23"
              fill="none"
              strokeDasharray="9 6"
              className={cn(
                "transition-[stroke,stroke-width] duration-300 motion-reduce:transition-none",
                dragging ? "file-dropzone-march stroke-accent [stroke-width:2.5]" : "stroke-muted/60 [stroke-width:1.5] group-hover/dz:stroke-accent",
              )}
            />
          </svg>

          <span className="relative grid place-items-center">
            {/* A small fan of pages showing how many files are being dragged. */}
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "absolute h-12 w-10 rounded-md border border-border bg-surface shadow-sm transition-[opacity,translate,rotate] duration-300 motion-reduce:transition-none",
                  dragging && i < Math.max(1, Math.min(3, count)) ? "opacity-100" : "opacity-0",
                )}
                style={{
                  translate: dragging ? `${(i - 1) * 22}px -6px` : "0 0",
                  rotate: dragging ? `${(i - 1) * 14}deg` : "0deg",
                }}
              />
            ))}
            <span
              aria-hidden
              className={cn(
                "relative grid size-14 place-items-center rounded-2xl bg-linear-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_10px_30px_-10px_var(--accent)]",
                dragging && "file-dropzone-bounce",
              )}
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M7 9l5-5 5 5" />
                <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
            </span>
          </span>

          <span className="grid">
            <span
              id={labelId}
              className={cn(
                "col-start-1 row-start-1 text-base font-semibold transition-opacity duration-200 motion-reduce:transition-none",
                dragging && "opacity-0",
              )}
            >
              {label}
            </span>
            <span
              aria-hidden
              className={cn(
                "col-start-1 row-start-1 text-base font-semibold text-accent transition-opacity duration-200 motion-reduce:transition-none",
                dragging ? "opacity-100" : "opacity-0",
              )}
            >
              {count > 1 ? `Drop ${count} files` : count === 1 ? "Drop 1 file" : "Drop to add"}
            </span>
          </span>
          <span id={descId} className="max-w-sm text-sm text-muted">
            {instructions}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {rejections.length ? (
        <ul aria-label="Files not added" className="mt-3 flex flex-col gap-2">
          {rejections.map((r) => (
            <li key={r.id} className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/8 py-1.5 pl-3 pr-1.5 text-sm">
              <svg aria-hidden viewBox="0 0 16 16" className="mt-2 size-4 shrink-0 text-rose-700 dark:text-rose-300" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 4.5v4M8 11v.5" strokeLinecap="round" />
              </svg>
              <p className="min-w-0 flex-1 py-1.5">
                <span className="break-all font-medium">{r.name}</span>{" "}
                <span className="text-rose-700 dark:text-rose-300">{r.reason}</span>
              </p>
              <button
                type="button"
                aria-label={`Dismiss message about ${r.name}`}
                onClick={() => setRejections((list) => list.filter((x) => x.id !== r.id))}
                className={iconButton}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {files.length ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-3 @md:p-4">
          <div className="flex items-center justify-between gap-3 px-1 text-sm">
            <span className="font-medium">{headline}</span>
            <span className="tabular-nums text-muted">{overall}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Overall upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overall}
            className="relative mx-1 mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="relative h-full overflow-hidden rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${overall}%` }}
            >
              {busy ? (
                <span aria-hidden className="file-dropzone-sheen absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent" />
              ) : null}
            </div>
          </div>

          <ul aria-label="Files" className="mt-3 flex flex-col gap-1">
            {files.map((f) => {
              const pct = Math.round(f.progress * 100);
              const name = f.file.name;
              return (
                <li key={f.id} className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-surface-2 motion-reduce:transition-none">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">
                    {f.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.previewUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <TypeIcon file={f.file} />
                    )}
                    {f.status === "uploading" || f.status === "queued" ? (
                      <span aria-hidden className="absolute inset-0 grid place-items-center bg-black/45">
                        <svg viewBox="0 0 36 36" className="size-7 -rotate-90">
                          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="3.5" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke="white"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray={`${pct} 100`}
                            className="transition-[stroke-dasharray] duration-300 motion-reduce:transition-none"
                          />
                        </svg>
                      </span>
                    ) : null}
                    {f.status === "done" ? (
                      <span aria-hidden className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-emerald-600 text-white ring-2 ring-surface">
                        <svg viewBox="0 0 16 16" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3.5 8.5l3 3 6-7" />
                        </svg>
                      </span>
                    ) : null}
                    {f.status === "error" ? (
                      <span aria-hidden className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-surface">
                        !
                      </span>
                    ) : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{name}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
                      <span className="tabular-nums text-muted">{formatBytes(f.file.size)}</span>
                      <span
                        className={cn(
                          "tabular-nums",
                          f.status === "done" && "text-emerald-700 dark:text-emerald-300",
                          f.status === "error" && "text-rose-700 dark:text-rose-300",
                          (f.status === "queued" || f.status === "uploading") && "text-muted",
                        )}
                      >
                        {f.status === "queued"
                          ? "Waiting"
                          : f.status === "uploading"
                            ? `Uploading ${pct}%`
                            : f.status === "done"
                              ? "Uploaded"
                              : f.error}
                      </span>
                    </span>
                    {f.status === "uploading" ? (
                      <span aria-hidden className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full bg-accent transition-[width] duration-300 ease-out motion-reduce:transition-none"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    ) : null}
                  </span>

                  <span className="flex shrink-0 items-center">
                    {f.status === "error" ? (
                      <button type="button" aria-label={`Retry ${name}`} onClick={() => retry(f)} className={iconButton}>
                        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.5h-2.5" />
                        </svg>
                      </button>
                    ) : null}
                    {f.status === "uploading" || f.status === "queued" ? (
                      <button type="button" aria-label={`Cancel upload of ${name}`} onClick={() => cancel(f)} className={iconButton}>
                        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    ) : (
                      <button type="button" aria-label={`Remove ${name}`} onClick={() => remove(f)} className={iconButton}>
                        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 8.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.5" />
                        </svg>
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
