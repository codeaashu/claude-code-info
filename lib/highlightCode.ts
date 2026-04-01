import { codeToHtml, type BundledLanguage } from "shiki";

/** Keep highlighting bounded for serverless timeouts on huge files */
const HIGHLIGHT_CHAR_CAP = 150_000;

const EXT_TO_LANG: Record<string, BundledLanguage> = {
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".md": "markdown",
  ".txt": "markdown",
  ".mdx": "mdx",
  ".css": "css",
  ".html": "html",
  ".htm": "html",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".sql": "sql",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".toml": "toml",
  ".ini": "ini",
  ".xml": "xml",
  ".vue": "vue",
  ".svelte": "svelte",
  ".dockerfile": "docker",
};

function extToLang(ext: string): BundledLanguage {
  const lang = EXT_TO_LANG[ext.toLowerCase()];
  if (lang) return lang;
  /* Loose highlighter for unknown extensions (logs, config fragments, etc.) */
  return "markdown";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function highlightSource(
  code: string,
  ext: string,
): Promise<{ html: string; highlightTruncated: boolean }> {
  let highlightTruncated = false;
  let slice = code;
  if (code.length > HIGHLIGHT_CHAR_CAP) {
    slice = code.slice(0, HIGHLIGHT_CHAR_CAP);
    highlightTruncated = true;
  }

  const lang = extToLang(ext);
  try {
    const html = await codeToHtml(slice, {
      lang,
      theme: "github-dark",
    });
    return { html, highlightTruncated };
  } catch {
    try {
      const html = await codeToHtml(slice, {
        lang: "markdown",
        theme: "github-dark",
      });
      return { html, highlightTruncated };
    } catch {
      const safe = escapeHtml(slice);
      return {
        html: `<pre class="shiki fallback-plain"><code>${safe}</code></pre>`,
        highlightTruncated,
      };
    }
  }
}
