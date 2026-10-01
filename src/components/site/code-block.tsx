import { codeToHtml } from "shiki";
import { CopyButton } from "./copy-button";

interface CodeBlockProps {
  code: string;
  lang?: "tsx" | "ts" | "bash" | "md";
  /** Accessible name for the scrollable region. */
  label: string;
}

/** Server-rendered, syntax-highlighted code with a copy button. */
export async function CodeBlock({ code, lang = "tsx", label }: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: "light",
  });

  return (
    <div className="relative rounded-xl border border-border bg-surface-2">
      <div className="absolute right-2 top-2 z-10">
        <CopyButton value={code.trim()} />
      </div>
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="max-h-[520px] overflow-auto rounded-xl p-4 pr-16 font-mono text-[13px] leading-relaxed focus-visible:outline-2 focus-visible:outline-ring"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
