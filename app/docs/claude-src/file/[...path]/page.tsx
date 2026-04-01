import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { highlightSource } from "@/lib/highlightCode";
import {
  loadManifest,
  readSrcPreview,
  safeResolveSrcFile,
  type ClaudeSrcFileEntry,
} from "@/lib/claudeSrc";

type Props = {
  params: Promise<{ path?: string[] }>;
};

function entryForPath(files: ClaudeSrcFileEntry[], posix: string): ClaudeSrcFileEntry | undefined {
  return files.find((f) => f.path === posix);
}

/** Pre-render every manifest path at build → CDN static HTML, minimal runtime function invocations */
export async function generateStaticParams(): Promise<{ path: string[] }[]> {
  const manifest = await loadManifest();
  return manifest.files.map((f) => ({
    path: f.path.split("/").filter(Boolean),
  }));
}

/** Only paths from generateStaticParams exist; unknown paths 404 without executing the page handler */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path: segments } = await params;
  if (!segments?.length) return { title: "File — claude/src" };
  const posix = segments.map((s) => decodeURIComponent(s)).join("/");
  return { title: `${posix} — claude/src` };
}

export default async function ClaudeSrcFilePage({ params }: Props) {
  const { path: segments } = await params;
  if (!segments?.length) notFound();

  const posix = segments.map((s) => decodeURIComponent(s)).join("/");
  const full = safeResolveSrcFile(posix);
  if (!full) notFound();

  const manifest = await loadManifest();
  const meta = entryForPath(manifest.files, posix);
  if (!meta) notFound();

  let preview: { content: string; truncated: boolean } | null = null;
  if (meta.isText) {
    try {
      preview = await readSrcPreview(full);
    } catch {
      preview = null;
    }
  }

  const highlighted =
    preview && meta.isText
      ? await highlightSource(preview.content, meta.ext || ".txt")
      : null;

  return (
    <article className="text-foreground space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">📄 File detail</p>
        <h1 className="break-all text-2xl font-bold leading-tight">{meta.path}</h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>
            🧩 <strong>{meta.ext || "no ext"}</strong>
          </span>
          <span>
            📏 <strong>{meta.lineCount.toLocaleString()}</strong> lines
          </span>
          <span>
            💾 <strong>{meta.size.toLocaleString()}</strong> bytes
          </span>
          <span>{meta.isText ? "📝 text" : "🗃️ binary / limited preview"}</span>
        </div>
        <Link href="/docs/claude-src" className="inline-block text-sm underline">
          ← Back to all files
        </Link>
      </div>

      <section className="space-y-2 border-2 border-black p-4 dark:border-white">
        <h2 className="text-sm font-semibold uppercase tracking-wider">🎯 Use case</h2>
        <p className="text-sm leading-relaxed">{meta.useCase || "—"}</p>
        <p className="text-xs opacity-75">
          Generated from folder role, exports, dependency roots, and inline comments — not hand-reviewed for every path.
        </p>
      </section>

      <section className="space-y-2 border-2 border-black p-4 dark:border-white">
        <h2 className="text-sm font-semibold uppercase tracking-wider">🧠 Inline summary</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{meta.summary || "—"}</p>
      </section>

      {meta.exports.length > 0 && (
        <section className="space-y-2 border-2 border-black p-4 dark:border-white">
          <h2 className="text-sm font-semibold uppercase tracking-wider">📤 Exports (heuristic)</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {meta.exports.map((name) => (
              <li key={name} className="border border-black px-2 py-0.5 dark:border-white">
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      {meta.importRoots.length > 0 && (
        <section className="space-y-2 border-2 border-black p-4 dark:border-white">
          <h2 className="text-sm font-semibold uppercase tracking-wider">📚 External import roots</h2>
          <p className="text-xs opacity-80">Package roots from <code>from &quot;…&quot;</code> (relative paths omitted).</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {meta.importRoots.map((p) => (
              <li key={p} className="border border-black px-2 py-0.5 dark:border-white">
                <code>{p}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider">🖥️ Source preview</h2>
        {!meta.isText ? (
          <p className="text-sm">Binary or non-text type — no UTF-8 preview in the app.</p>
        ) : !preview ? (
          <p className="text-sm">Could not read file from disk.</p>
        ) : (
          <>
            {preview.truncated && (
              <p className="text-xs">
                ⚠️ Preview truncated to ~400KB. Open the file locally for the full content.
              </p>
            )}
            {highlighted?.highlightTruncated && (
              <p className="text-xs">
                ⚠️ Syntax highlighting applies to the first ~150k characters only (performance); the raw preview above may be longer.
              </p>
            )}
            {highlighted && (
              <div
                className="doc-shiki max-h-[min(70vh,900px)] overflow-auto border-2 border-black text-xs leading-snug dark:border-white"
                dangerouslySetInnerHTML={{ __html: highlighted.html }}
              />
            )}
          </>
        )}
      </section>
    </article>
  );
}
