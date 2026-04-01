"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ListRow = { path: string; ext: string; lineCount: number; useCase: string };

export function FileListClient({
  rows,
  byFolder,
}: {
  rows: ListRow[];
  byFolder: Record<string, ListRow[]>;
}) {
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string | "all">("all");

  const folders = useMemo(() => Object.keys(byFolder).sort(), [byFolder]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pool =
      folder === "all" ? rows : byFolder[folder] ?? [];
    if (!needle) return pool;
    return pool.filter((r) => r.path.toLowerCase().includes(needle));
  }, [q, folder, rows, byFolder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wider">
          🔎 Filter path
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. bridge/sessionRunner"
            className="border-2 border-black bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-white"
          />
        </label>
        <label className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold uppercase tracking-wider">
          📁 Top folder
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value as typeof folder)}
            className="border-2 border-black bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-white"
          >
            <option value="all">All ({rows.length})</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}/ ({byFolder[f]?.length ?? 0})
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm">
          Showing <strong>{filtered.length}</strong> of {rows.length} files
        </p>
      </div>

      <ul className="grid max-h-[70vh] gap-0 divide-y-2 divide-black overflow-y-auto border-2 border-black dark:divide-white dark:border-white">
        {filtered.map((r) => (
          <li key={r.path}>
            <Link
              title={r.useCase.slice(0, 500)}
              href={`/docs/claude-src/file/${r.path
                .split("/")
                .map((seg) => encodeURIComponent(seg))
                .join("/")}`}
              className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
            >
              <span className="break-all">{r.path}</span>
              <span className="shrink-0 text-xs opacity-80">
                {r.ext || "—"} · {r.lineCount.toLocaleString()} lines
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
