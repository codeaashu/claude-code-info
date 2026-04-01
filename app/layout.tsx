import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import Script from "next/script";
import { ThemeToggle } from "@/components/ThemeToggle";
import { themeInitScript } from "./theme-init";
import "./globals.css";

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-code-pro",
});

export const metadata: Metadata = {
  title: "Claude files info",
  description:
    "Browse leaked Claude Code source: every file under claude/src with docs, summaries, and syntax-highlighted previews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sourceCodePro.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col transition-colors duration-200 [font-family:var(--font-source-code-pro),ui-monospace,monospace]">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="flex flex-col items-center justify-center gap-3 border-t-2 border-black px-4 py-4 text-center text-sm dark:border-white sm:flex-row sm:justify-between sm:text-left">
          <span>
            Built by{" "}
            <a
              href="https://x.com/21prnv"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:no-underline"
            >
              prnv
            </a>
          </span>
          <ThemeToggle />
        </footer>
      </body>
    </html>
  );
}
