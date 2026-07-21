#!/usr/bin/env node
/**
 * check-docs — static docs governance checks (docs/roadmap/05-docs-standardization/03-doc-governance.md).
 *
 * 1. Every relative markdown link inside docs/** and .claude/docs/** resolves to a real file.
 * 2. Every docs/roadmap/<group>/*.md item file (excluding README.md and the legacy/ folder)
 *    has a `> Trạng thái:` status header, so progress tracking doesn't silently rot.
 *
 * Deliberately dependency-free (no markdown-link-check, no glob lib) — this repo's docs tree is
 * small enough that a plain recursive walk + regex is fast and has zero new deps to maintain.
 * Runs in <1s; safe to wire into CI on every PR.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

function stripCodeSpans(text) {
  // Avoid false positives from inline code like `handler](params)`.
  return text.replace(/`[^`]*`/g, "").replace(/```[\s\S]*?```/g, "");
}

const LINK_RE = /\]\(([^)#\s]+(?:\.md|\.ts|\.tsx|\/)?)(#[^)]*)?\)/g;

function checkLinks() {
  const targets = [join(ROOT, "docs"), join(ROOT, ".claude", "docs")];
  const files = targets.flatMap((dir) => {
    try {
      return walk(dir);
    } catch {
      return [];
    }
  });
  // Also check the two root docs entrypoints.
  for (const f of ["README.md", "CLAUDE.md"]) {
    try {
      statSync(join(ROOT, f));
      files.push(join(ROOT, f));
    } catch {
      // optional
    }
  }

  const broken = [];
  for (const file of files) {
    const text = stripCodeSpans(readFileSync(file, "utf8"));
    const base = dirname(file);
    for (const match of text.matchAll(LINK_RE)) {
      const link = match[1];
      if (/^(https?:|mailto:)/.test(link)) continue;
      const target = normalize(join(base, link));
      try {
        statSync(target);
      } catch {
        broken.push(`${relative(ROOT, file)}: ${link}`);
      }
    }
  }
  return broken;
}

function checkRoadmapStatusHeaders() {
  const roadmapDir = join(ROOT, "docs", "roadmap");
  let groups;
  try {
    groups = readdirSync(roadmapDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const missing = [];
  for (const group of groups) {
    if (!group.isDirectory() || group.name === "legacy") continue;
    const groupDir = join(roadmapDir, group.name);
    for (const entry of readdirSync(groupDir)) {
      if (entry === "README.md" || !entry.endsWith(".md")) continue;
      const full = join(groupDir, entry);
      const text = readFileSync(full, "utf8");
      if (!/^>\s*Trạng thái:/m.test(text)) {
        missing.push(relative(ROOT, full));
      }
    }
  }
  return missing;
}

const brokenLinks = checkLinks();
const missingStatus = checkRoadmapStatusHeaders();

let failed = false;

if (brokenLinks.length > 0) {
  failed = true;
  console.error(`\n✗ ${brokenLinks.length} broken internal link(s):`);
  for (const b of brokenLinks) console.error(`  ${b}`);
} else {
  console.log(`✓ All internal doc links resolve.`);
}

if (missingStatus.length > 0) {
  failed = true;
  console.error(`\n✗ ${missingStatus.length} roadmap item(s) missing a "> Trạng thái:" header:`);
  for (const m of missingStatus) console.error(`  ${m}`);
} else {
  console.log(`✓ Every roadmap item has a status header.`);
}

if (failed) {
  console.error(`\ncheck-docs failed. See docs/roadmap/05-docs-standardization/03-doc-governance.md.`);
  process.exit(1);
}

console.log(`\ncheck-docs passed.`);
