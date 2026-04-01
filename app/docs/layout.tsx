import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Claude src — file docs",
  description:
    "Leaked Claude Code source explorer: per-file docs, use cases, and highlighted claude/src previews.",
};

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full bg-white text-black [font-family:var(--font-source-code-pro),ui-monospace,monospace] dark:bg-background dark:text-foreground">
      <header className="sticky top-0 z-10 border-b-4 border-black bg-white dark:border-white dark:bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/docs/claude-src" className="text-lg font-semibold tracking-tight hover:underline">
            📂 Claude <code className="font-semibold">src</code> explorer
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">
              🏠 Home
            </Link>
            <Link href="/docs/claude-src" className="hover:underline">
              📑 All files
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
