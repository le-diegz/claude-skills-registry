#!/usr/bin/env node
/**
 * build-watch.js
 * Watches skills/ for any change and rebuilds index.json automatically.
 * Used by: npm run build:watch
 *
 * Usage:
 *   node scripts/build-watch.js
 */

import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import chokidar from "chokidar";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const BUILD_SCRIPT = path.join(REPO_ROOT, "scripts", "build-index.js");

// Debounce: avoid firing multiple rebuilds for a burst of file saves
let debounceTimer = null;
const DEBOUNCE_MS = 300;

function rebuild(eventType, filePath) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
    console.log(`[watch] ${eventType}: ${rel} — rebuilding index…`);

    try {
      const output = execSync(`node "${BUILD_SCRIPT}"`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        env: { ...process.env },
      }).trim();
      console.log(`[watch] ${output}`);
    } catch (err) {
      const msg = (err.stderr ?? err.stdout ?? err.message ?? "").trim();
      console.error(`[watch] build failed:\n  ${msg.replace(/\n/g, "\n  ")}`);
    }
  }, DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Initial build on startup
// ---------------------------------------------------------------------------

console.log(`Watching skills/ for changes. Press Ctrl+C to stop.\n`);

try {
  const output = execSync(`node "${BUILD_SCRIPT}"`, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: { ...process.env },
  }).trim();
  console.log(`[watch] initial build: ${output}\n`);
} catch (err) {
  const msg = (err.stderr ?? err.stdout ?? err.message ?? "").trim();
  console.error(`[watch] initial build failed:\n  ${msg}`);
}

// ---------------------------------------------------------------------------
// Watch
// ---------------------------------------------------------------------------

chokidar
  .watch(SKILLS_DIR, {
    ignoreInitial: true,
    // Ignore editor temp files and OS metadata
    ignored: /(^|[/\\])\..|(\.swp$)|(~$)/,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  })
  .on("add",    (p) => rebuild("add", p))
  .on("change", (p) => rebuild("change", p))
  .on("unlink", (p) => rebuild("remove", p))
  .on("addDir", (p) => rebuild("mkdir", p))
  .on("unlinkDir", (p) => rebuild("rmdir", p))
  .on("error",  (err) => console.error(`[watch] watcher error: ${err.message}`));
