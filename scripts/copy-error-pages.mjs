#!/usr/bin/env node
/**
 * Copies the built error pages into dist/client/_errors/<code>.html.
 *
 * The Cloudflare zone serves custom error pages from /_errors/*.html (the
 * paths the old Eleventy build emitted via permalinks). Astro can't output
 * underscore-prefixed routes directly, so this runs after `astro build`:
 *
 *   /404.html                → /_errors/404.html   (Astro special-cases 404/500)
 *   /500.html                → /_errors/500.html   (5XX Errors slot)
 *   /403/index.html          → /_errors/403.html   (WAF / IP / rate-limit block slots)
 *   /503/index.html          → /_errors/503.html
 *   /1000/index.html         → /_errors/1000.html  (1XXX Errors slot)
 *   /challenge/index.html    → /_errors/challenge.html (Managed/Interactive/Country Challenge slots)
 *   /under-attack/index.html → /_errors/under-attack.html (Non-Interactive Challenge slot)
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const distArg = process.argv[2] ?? "dist";
const clientDir = join(process.cwd(), distArg, "client");
const errorsDir = join(clientDir, "_errors");

const sources = {
  "404.html": "404.html",
  "500.html": "500.html",
  "403/index.html": "403.html",
  "503/index.html": "503.html",
  "1000/index.html": "1000.html",
  "challenge/index.html": "challenge.html",
  "under-attack/index.html": "under-attack.html",
};

mkdirSync(errorsDir, { recursive: true });

let failed = 0;
for (const [source, target] of Object.entries(sources)) {
  const sourcePath = join(clientDir, source);
  if (!existsSync(sourcePath)) {
    console.error(`  ✗ missing built error page: ${source}`);
    failed++;
    continue;
  }
  copyFileSync(sourcePath, join(errorsDir, target));
}

if (failed > 0) {
  process.exit(1);
}

console.log("Error pages copied to /_errors/.");
