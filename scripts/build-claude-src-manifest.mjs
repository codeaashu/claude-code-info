#!/usr/bin/env node
/**
 * Walks claude/src and writes app/docs/data/claude-src-manifest.json
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "claude", "src");
const OUT = path.resolve(process.cwd(), "app", "docs", "data", "claude-src-manifest.json");

const TEXT_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
]);

/** Where this file sits in the Claude codebase — for narrative “use case” blurbs */
const TOP_AREA = {
  assistant: "the assistant runtime (history, SDK-facing session helpers)",
  bootstrap: "process bootstrap and early startup wiring",
  bridge: "the bridge between the UI/shell and the agent (IPC, REPL hooks, permissions, session glue)",
  buddy: "“buddy” companion flows and coordination helpers",
  cli: "the CLI transport, NDJSON/streaming I/O, and command handlers",
  commands: "named product commands users invoke (login, help, stats, session flows, …)",
  components: "shared React UI pieces",
  constants: "static strings, built-in prompts, spinners, and style constants",
  context: "assembling model context, attachments, and conversation state",
  coordinator: "orchestrating multi-step or multi-agent work",
  entrypoints: "public entry surfaces and SDK-facing entrypoints",
  hooks: "reusable UI or integration hooks",
  ink: "Ink terminal UI (layouts, TTY IO, keyboard, renderer components)",
  keybindings: "keyboard shortcuts and binding tables",
  memdir: "on-disk “memory directory” workflows (scanning, prompts, team memory)",
  migrations: "version migrations for settings or on-disk data",
  moreright: "“more menu” / sidebar integrations in the desktop UI",
  "native-ts": "Node-side helpers (indexing, diffs, small native-style utilities)",
  outputStyles: "how assistant output is labeled and formatted for display",
  plugins: "plugin host, bundled plugins, and plugin lifecycle",
  query: "the query pipeline (budgets, hooks, engine config, stop conditions)",
  remote: "remote sessions, WebSockets, and SDK message bridging",
  schemas: "validation schemas and typed payload shapes",
  screens: "full-screen React flows and primary UI routes",
  server: "local or auxiliary HTTP/WebSocket servers used by the product",
  services: "long-lived services (LSP, MCP, OAuth, tool execution, memory, compaction, voice, settings sync, …)",
  skills: "skill discovery, bundled skills, and MCP skill builders",
  state: "central application state slices and reducers/stores",
  tasks: "task implementations the scheduler runs (local agent, shell, remote agent, dream, …)",
  tools: "concrete tool implementations the model may call (files, bash, web, todos, MCP, …)",
  types: "shared TypeScript types and generated typings",
  utils: "cross-cutting helpers (shell, tempfiles, settings, messages, process input, …)",
  vim: "Vim-style modal editing integrations",
  voice: "voice capture, STT, and keyterm plumbing",
  upstreamproxy: "proxying traffic to upstream API or gateway layers",
};

const ROOT_FILE_USE = {
  "main.tsx": "Mounts the primary React UI for the desktop product.",
  "Task.ts": "Defines the core task abstraction and types used by the task runner.",
  "Tool.ts": "Defines the tool contract and metadata shared across tool implementations.",
  "QueryEngine.ts": "Runs or configures the main query/engine loop for model calls.",
  "query.ts": "Public surface of the query module (engine wiring or re-exports).",
  "hooks.ts": "Aggregates or re-exports hooks shared across the app.",
  "ink.ts": "Entry or re-exports for the Ink terminal UI subsystem.",
  "tools.ts": "Registers or re-exports built-in tools for the agent.",
  "tasks.ts": "Registers task types or re-exports task implementations.",
  "context.ts": "Builds or exports conversation context for the model.",
  "commands.ts": "Registers commands or exposes the command dispatcher surface.",
  "setup.ts": "Runs installation/setup or first-launch initialization.",
  "history.ts": "Reads or normalizes session / transcript history.",
  "interactiveHelpers.tsx": "Helpers for interactive CLI prompts and confirmations.",
  "dialogLaunchers.tsx": "Launches system or in-app dialogs from the agent UI.",
  "replLauncher.tsx": "Starts or connects the REPL bridge from the UI layer.",
  "projectOnboardingState.ts": "Tracks onboarding state for new projects.",
  "cost-tracker.ts": "Tracks token or dollar cost for API usage.",
  "costHook.ts": "React hook or adapter for surfacing cost data in the UI.",
};

const PKG_USE = {
  react: "React UI",
  "react-dom": "React DOM rendering",
  ink: "terminal Ink UI",
  zod: "schema validation",
  axios: "HTTP client",
  ws: "WebSockets",
  zustand: "client state",
  execa: "child processes",
  glob: "file globbing",
  minimist: "CLI argv parsing",
  diff: "text diffing",
  semver: "version comparison",
  uuid: "ID generation",
  chalk: "terminal styling",
  ora: "terminal spinners",
  "fuse.js": "fuzzy search",
  immer: "immutable updates",
  fs: "Node filesystem",
  path: "Node path helpers",
  os: "Node OS/process metadata",
  child_process: "subprocess spawning",
  readline: "interactive line input",
  stream: "Node streams",
  util: "Node util helpers",
  events: "Node events",
  http: "Node HTTP",
  https: "Node HTTPS",
  net: "Node networking",
  "node:fs": "filesystem",
  "node:path": "paths",
  "node:child_process": "subprocesses",
  "node:net": "networking",
};

function extractLeadComment(src) {
  const t = src.trimStart();
  if (t.startsWith("/**")) {
    const end = t.indexOf("*/");
    if (end !== -1) {
      return t.slice(0, end + 2).replace(/^\/\*\*?/, "").replace(/\*\/$/, "").replace(/^\s*\* ?/gm, "").trim();
    }
  }
  if (t.startsWith("/*")) {
    const end = t.indexOf("*/");
    if (end !== -1 && !t.slice(0, end).includes("@")) {
      return t.slice(2, end).replace(/^\s*\* ?/gm, "").trim();
    }
  }
  const lines = src.split("\n").slice(0, 12);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\s*\/\/\s?(.*)/);
    if (m) out.push(m[1]);
    else if (out.length) break;
  }
  if (out.length >= 2) return out.join(" ").slice(0, 800);
  return "";
}

function extractExports(src) {
  const found = new Set();
  const re =
    /export\s+(?:default\s+)?(?:async\s+)?(?:function\s+(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+)|type\s+(\w+)|interface\s+(\w+))/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1] || m[2] || m[3] || m[4] || m[5];
    if (name) found.add(name);
  }
  if (/export\s+default\s+/m.test(src)) found.add("default");
  const namedBlock = /export\s*\{([^}]+)\}/g;
  while ((m = namedBlock.exec(src)) !== null) {
    m[1].split(",").forEach((part) => {
      const n = part.trim().split(/\s+as\s+/)[0]?.trim();
      if (n) found.add(n);
    });
  }
  return [...found].slice(0, 40);
}

function extractImportRoots(src) {
  const roots = new Set();
  const re = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const s = m[1];
    if (s.startsWith(".") || s.startsWith("/")) continue;
    const root = s.split("/")[0];
    if (root) roots.add(root);
  }
  return [...roots].slice(0, 25);
}

/** First path segments referenced by relative imports ( sibling / parent packages ). */
function extractRelativeImportRoots(src) {
  const roots = new Set();
  const re = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let p = m[1];
    while (p.startsWith("./") || p.startsWith("../")) {
      if (p.startsWith("./")) p = p.slice(2);
      else if (p.startsWith("../")) p = p.slice(3);
    }
    const seg = p.split("/")[0]?.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "") ?? "";
    if (seg && !seg.includes(".")) roots.add(seg);
  }
  return [...roots].slice(0, 15);
}

function sentencify(part) {
  const t = part.trim();
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function joinReadable(list, max = 4) {
  const a = [...new Set(list)].filter(Boolean).slice(0, max);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

function looksLikeProseLeadComment(text) {
  if (!text || text.length < 24) return false;
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  const importish = lines.filter((l) => /^import\s/.test(l) || /^export\s/.test(l)).length;
  if (importish / lines.length > 0.35) return false;
  if (/^(import|export|const|let|var|function|class|type|interface)\s/m.test(text.trim())) return false;
  return true;
}

function inferUseCase(rel, ext, exports, importRoots, relImportRoots, leadCommentOnly, lineCount) {
  const posix = rel.replace(/\\/g, "/");
  const parts = posix.split("/");
  const base = parts.at(-1) ?? posix;
  const stem = base.replace(/\.[^.]+$/, "");
  const top = parts[0] ?? "";
  const second = parts[1] ?? "";

  const sentences = [];

  if (parts.length === 1 && ROOT_FILE_USE[base]) {
    sentences.push(ROOT_FILE_USE[base]);
  } else if (top && TOP_AREA[top]) {
    const area = TOP_AREA[top];
    if (top === "tools" && second && second !== "shared" && second !== "testing") {
      const human = second.replace(/Tool$/i, "").replace(/([A-Z])/g, " $1").trim();
      sentences.push(
        `This module implements the “${second}” tool (${human}) — something the model can call at runtime alongside other agent tools.`,
      );
    } else if (top === "tasks" && second && !second.startsWith(".")) {
      sentences.push(
        `This module is a “${second}” task implementation — concrete work units the task runner schedules and monitors.`,
      );
    } else {
      sentences.push(`This file lives under “${top}/”, which covers ${sentencify(area)}`.replace(/\.\.$/, "."));
    }
  } else if (parts.length === 1) {
    sentences.push(
      `Root-level ${ext === ".tsx" ? "UI " : ""}module in the Claude codebase (${base}); it ties together multiple subsystems rather than belonging to one folder.`,
    );
  }

  const typeish = exports.filter((n) => /^[A-Z]/.test(n) || /^(type|interface)$/i.test(n)).length;
  const fnLike = exports.filter((n) => /^[a-z]/.test(n) || n === "default").length;

  if (exports.length > 0) {
    const sample = exports.filter((n) => n !== "default").slice(0, 5);
    const hasDefault = exports.includes("default");
    if (sample.length === 0 && hasDefault) {
      sentences.push("It primarily provides a default export (component, class, or entry function).");
    } else if (sample.length > 0) {
      const kind =
        typeish > fnLike
          ? "types, interfaces, or factory objects"
          : "functions, hooks, or classes";
      sentences.push(
        `On the API surface it exposes ${joinReadable(sample, 5)}${exports.length > 5 ? " (and more)" : ""} — mainly ${kind}.`,
      );
    }
  } else if ([".ts", ".tsx", ".js", ".jsx"].includes(ext) && lineCount > 5) {
    sentences.push("It has no simple static exports detected; it may use side effects, re-exports, or patterns the scanner missed.");
  }

  if (importRoots.length > 0) {
    const humanPkgs = importRoots
      .map((p) => PKG_USE[p] ?? p)
      .slice(0, 4);
    sentences.push(`Dependencies touch ${joinReadable(humanPkgs, 4)}.`);
  }

  if (relImportRoots.length > 0) {
    const internal = relImportRoots.filter((r) => r !== stem);
    if (internal.length > 0) {
      sentences.push(`It composes internal code from ${joinReadable(internal, 5)} (relative imports).`);
    }
  }

  if (ext === ".tsx" && !sentences.some((s) => s.includes("UI") || s.includes("React"))) {
    sentences.push("The .tsx extension suggests React UI or JSX-heavy glue.");
  }

  if (looksLikeProseLeadComment(leadCommentOnly)) {
    const clipped = leadCommentOnly.replace(/\s+/g, " ").trim().slice(0, 280);
    sentences.push(`What the file header says: ${sentencify(clipped)}`);
  }

  let text = sentences.join(" ").replace(/\s+/g, " ").trim();
  if (!text) {
    text = `Supporting module at \`${posix}\`; inspect exports and imports in the sections below for behavior.`;
  }
  if (text.length > 1200) text = `${text.slice(0, 1197)}…`;
  return text;
}

async function walk(dir, baseRel, acc) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = baseRel ? `${baseRel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      await walk(abs, rel, acc);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      acc.push({ abs, rel, ext });
    }
  }
}

async function main() {
  let list = [];
  try {
    await fs.access(ROOT);
  } catch {
    console.error("Missing claude/src at", ROOT);
    process.exit(1);
  }
  await walk(ROOT, "", list);
  list.sort((a, b) => a.rel.localeCompare(b.rel));

  const manifest = {
    generatedAt: new Date().toISOString(),
    rootLabel: "claude/src",
    fileCount: 0,
    files: [],
  };

  for (const { abs, rel, ext } of list) {
    let lineCount = 0;
    let size = 0;
    let isText = TEXT_EXTS.has(ext);
    let summary = "";
    let useCase = "";
    let exports = [];
    let importRoots = [];
    let relativeImportRoots = [];

    try {
      const buf = await fs.readFile(abs);
      size = buf.length;
      if (isText && size < 2_000_000) {
        const src = buf.toString("utf8");
        lineCount = src.split("\n").length;
        const leadOnly = extractLeadComment(src);
        summary = leadOnly.slice(0, 1200);
        if (!summary) {
          const first = src.split("\n").slice(0, 5).join(" ").replace(/\s+/g, " ").trim();
          summary = first.slice(0, 400);
        }
        if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
          exports = extractExports(src);
          importRoots = extractImportRoots(src);
          relativeImportRoots = extractRelativeImportRoots(src);
        }
        useCase = inferUseCase(rel, ext, exports, importRoots, relativeImportRoots, leadOnly, lineCount);
      } else if (isText) {
        const src = buf.toString("utf8", { end: 50000 });
        lineCount = src.split("\n").length;
        summary = `Large text file (~${Math.round(size / 1024)} KB). Open the source tab for a truncated view in the app.`;
        useCase = `Large text artifact at this path; likely data, generated output, or a big config — open locally for full analysis.`;
      } else {
        summary = `Binary or non-doc preview type (${ext || "unknown"}).`;
        useCase = `Binary or asset file (${ext || "unknown"}); not intended for source-style documentation here.`;
      }
    } catch {
      summary = "Could not read file.";
      useCase = "Unreadable from the manifest builder; check permissions or path.";
    }

    manifest.files.push({
      path: rel.replace(/\\/g, "/"),
      ext,
      lineCount,
      size,
      isText,
      useCase,
      summary,
      exports,
      importRoots,
    });
  }

  manifest.fileCount = manifest.files.length;
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(manifest, null, 0), "utf8");
  console.log("Wrote", manifest.fileCount, "entries to", path.relative(process.cwd(), OUT));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
