import type { BuilderDocument } from "@ui-builder/builder-core";
import { compileDocumentStyles } from "./StaticStyleCompiler";
import { compileNodeToHtml, escapeHtml } from "./StaticNodeCompiler";

export interface StaticExportOptions {
  document: BuilderDocument;
  title?: string;
  lang?: string;
  meta?: Record<string, string>;
  minify?: boolean;
}

export interface StaticExportResult {
  html: string;
  css: string;
  combinedHtml: string;
}

/**
 * Compiles a BuilderDocument into semantic standalone HTML, scoped CSS, and full document HTML.
 */
export function exportDocumentToStaticHtml(options: StaticExportOptions): StaticExportResult {
  const { document, title = "Landing Page", lang = "en", meta = {} } = options;
  const rootNodeId = document.rootNodeId;
  const bodyHtml = rootNodeId ? compileNodeToHtml(rootNodeId, document) : "";
  const css = compileDocumentStyles(document);

  const metaTags = Object.entries(meta)
    .map(([name, content]) => `    <meta name="${escapeHtml(name)}" content="${escapeHtml(content)}" />`)
    .join("\n");

  const combinedHtml = `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
${metaTags ? metaTags + "\n" : ""}    <style>
${css}
    </style>
  </head>
  <body>
    <div class="ui-builder-scope">
${bodyHtml.replace(/^/gm, "      ")}
    </div>
  </body>
</html>`;

  return {
    html: bodyHtml,
    css,
    combinedHtml,
  };
}
