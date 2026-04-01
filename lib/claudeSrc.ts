import fs from "node:fs/promises";
import path from "node:path";

export type ClaudeSrcFileEntry = {
  path: string;
  ext: string;
  lineCount: number;
  size: number;
  isText: boolean;
  /** Narrative “what is this for?” generated from path, exports, imports, and comments */
  useCase: string;
  summary: string;
  exports: string[];
  importRoots: string[];
};

export type ClaudeSrcManifest = {
  generatedAt: string;
  rootLabel: string;
  fileCount: number;
  files: ClaudeSrcFileEntry[];
};

const SRC_ROOT = path.join(process.cwd(), "claude", "src");
const MANIFEST_PATH = path.join(process.cwd(), "app", "docs", "data", "claude-src-manifest.json");

export function getClaudeSrcRoot(): string {
  return SRC_ROOT;
}

export async function loadManifest(): Promise<ClaudeSrcManifest> {
  const raw = await fs.readFile(MANIFEST_PATH, "utf8");
  return JSON.parse(raw) as ClaudeSrcManifest;
}

export function safeResolveSrcFile(relativePosix: string): string | null {
  if (!relativePosix || relativePosix.includes("\0")) return null;
  const normalized = relativePosix.replace(/^\/+/, "").replace(/\\/g, "/");
  if (normalized.includes("..")) return null;
  const full = path.resolve(SRC_ROOT, ...normalized.split("/"));
  const rel = path.relative(SRC_ROOT, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return full;
}

const PREVIEW_MAX = 400_000;

export async function readSrcPreview(fullPath: string): Promise<{
  content: string;
  truncated: boolean;
  encoding: "utf8";
}> {
  const stat = await fs.stat(fullPath);
  const fd = await fs.open(fullPath, "r");
  try {
    const toRead = Math.min(stat.size, PREVIEW_MAX);
    const buf = Buffer.alloc(toRead);
    await fd.read(buf, 0, toRead, 0);
    const content = buf.toString("utf8");
    return {
      content,
      truncated: stat.size > PREVIEW_MAX,
      encoding: "utf8",
    };
  } finally {
    await fd.close();
  }
}

export function groupByTopDir(files: ClaudeSrcFileEntry[]): Map<string, ClaudeSrcFileEntry[]> {
  const m = new Map<string, ClaudeSrcFileEntry[]>();
  for (const f of files) {
    const top = f.path.split("/")[0] || "(root)";
    const arr = m.get(top) ?? [];
    arr.push(f);
    m.set(top, arr);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.path.localeCompare(b.path));
  return new Map([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}
