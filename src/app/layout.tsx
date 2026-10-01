import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lofi Component Lab",
    template: "%s · Lofi Component Lab",
  },
  description:
    "A growing gallery of reusable React + Tailwind components, built for the LofiStack 90 Day Build Challenge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
          <nav
            aria-label="Main"
            className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6"
          >
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground"
              >
                L
              </span>
              <span className="hidden min-[440px]:inline">Lofi Component Lab</span>
              <span className="sr-only min-[440px]:hidden">Lofi Component Lab</span>
            </Link>
            <div className="flex items-center gap-1 text-sm text-muted">
              <Link
                href="/components"
                className="rounded-md px-3 py-1.5 hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                Components
              </Link>
              <Link
                href="/logs"
                className="rounded-md px-3 py-1.5 hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                Logs
              </Link>
              <a
                href="https://github.com/EsamAhmed1/lofi-component-lab"
                className="rounded-md px-3 py-1.5 hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>Built for the LofiStack 90 Day Build Challenge.</p>
            <p>React · Next.js · TypeScript · Tailwind CSS</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
