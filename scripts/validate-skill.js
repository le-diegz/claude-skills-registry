#!/usr/bin/env node
/**
 * validate-skill.js
 * Validates a skill directory against the claude-skills-registry spec.
 *
 * Usage:
 *   node scripts/validate-skill.js skills/design/figma-to-tailwind
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(REPO_ROOT, "docs", "meta-schema.json");

/** Print a failure message and exit with code 1. */
function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Print a scoped failure message (field-level) and exit with code 1. */
function failField(field, reason) {
  console.error(`✗ meta.json → "${field}": ${reason}`);
  process.exit(1);
}

/** Check that a file exists; fail with a clear message if it doesn't. */
function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`missing required file: ${label}`);
  }
}

/** Check that a directory exists; fail with a clear message if it doesn't. */
function requireDir(dirPath, label) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    fail(`missing required directory: ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const [, , skillArg] = process.argv;

if (!skillArg) {
  fail(
    "no skill path provided.\n  Usage: node scripts/validate-skill.js skills/design/figma-to-tailwind"
  );
}

const skillDir = path.resolve(REPO_ROOT, skillArg);

if (!fs.existsSync(skillDir) || !fs.statSync(skillDir).isDirectory()) {
  fail(`skill directory not found: ${skillArg}`);
}

const skillDirName = path.basename(skillDir);

// ---------------------------------------------------------------------------
// Step 1 — Required top-level files and directories
// ---------------------------------------------------------------------------

requireFile(path.join(skillDir, "meta.json"), `${skillArg}/meta.json`);
requireFile(path.join(skillDir, "SKILL.md"), `${skillArg}/SKILL.md`);
requireDir(path.join(skillDir, "examples"), `${skillArg}/examples/`);
requireDir(path.join(skillDir, "evals"), `${skillArg}/evals/`);

// ---------------------------------------------------------------------------
// Step 2 — meta.json: parse and validate against JSON Schema
// ---------------------------------------------------------------------------

let meta;
try {
  const raw = fs.readFileSync(path.join(skillDir, "meta.json"), "utf-8");
  meta = JSON.parse(raw);
} catch (err) {
  fail(`meta.json is not valid JSON: ${err.message}`);
}

let schema;
try {
  const raw = fs.readFileSync(SCHEMA_PATH, "utf-8");
  schema = JSON.parse(raw);
} catch (err) {
  fail(`could not load meta-schema.json: ${err.message}`);
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const valid = validate(meta);

if (!valid) {
  const errors = validate.errors
    .map((e) => {
      const field = e.instancePath
        ? e.instancePath.replace(/^\//, "")
        : e.params?.missingProperty ?? "(root)";
      return `  • ${field}: ${e.message}`;
    })
    .join("\n");
  console.error(`✗ meta.json failed schema validation:\n${errors}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 3 — name must match the directory name
// ---------------------------------------------------------------------------

if (meta.name !== skillDirName) {
  failField(
    "name",
    `value "${meta.name}" does not match directory name "${skillDirName}"`
  );
}

// ---------------------------------------------------------------------------
// Step 4 — examples/ must contain at least one valid example-NN/ subdirectory
// ---------------------------------------------------------------------------

const examplesDir = path.join(skillDir, "examples");
const exampleDirs = fs
  .readdirSync(examplesDir)
  .filter((entry) => {
    const fullPath = path.join(examplesDir, entry);
    return (
      fs.statSync(fullPath).isDirectory() && /^example-\d{2}$/.test(entry)
    );
  })
  .sort();

if (exampleDirs.length === 0) {
  fail(
    `examples/ must contain at least one subdirectory named example-NN (e.g. example-01)`
  );
}

for (const dir of exampleDirs) {
  const base = path.join(examplesDir, dir);
  if (!fs.existsSync(path.join(base, "input.md"))) {
    fail(`examples/${dir}/ is missing input.md`);
  }
  if (!fs.existsSync(path.join(base, "output.md"))) {
    fail(`examples/${dir}/ is missing output.md`);
  }
}

// ---------------------------------------------------------------------------
// Step 5 — SKILL.md: frontmatter must be present with name and description
// ---------------------------------------------------------------------------

const skillMdContent = fs.readFileSync(
  path.join(skillDir, "SKILL.md"),
  "utf-8"
);

if (!skillMdContent.startsWith("---")) {
  fail(`SKILL.md must begin with YAML frontmatter (---).\n  See docs/skill-spec.md §3.`);
}

// Extract content between the first and second ---
const fmMatch = skillMdContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fmMatch) {
  fail(`SKILL.md frontmatter is malformed — could not find closing "---".\n  See docs/skill-spec.md §3.`);
}

const frontmatterBlock = fmMatch[1];

// Parse the two required frontmatter fields with simple key: value extraction
function extractFrontmatterField(block, key) {
  const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : null;
}

const fmName = extractFrontmatterField(frontmatterBlock, "name");
const fmDescription = extractFrontmatterField(frontmatterBlock, "description");

if (!fmName) {
  fail(`SKILL.md frontmatter is missing the "name" field.`);
}

if (!fmDescription) {
  fail(`SKILL.md frontmatter is missing the "description" field.`);
}

// ---------------------------------------------------------------------------
// Step 6 — Frontmatter name must match meta.json name
// ---------------------------------------------------------------------------

if (fmName !== meta.name) {
  fail(
    `SKILL.md frontmatter "name" ("${fmName}") does not match meta.json "name" ("${meta.name}").`
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Frontmatter description must match meta.json description
// ---------------------------------------------------------------------------

if (fmDescription !== meta.description) {
  fail(
    `SKILL.md frontmatter "description" does not match meta.json "description".\n` +
    `  SKILL.md : "${fmDescription}"\n` +
    `  meta.json: "${meta.description}"`
  );
}

// ---------------------------------------------------------------------------
// All checks passed
// ---------------------------------------------------------------------------

console.log(`✓ skill valid: ${meta.name} (v${meta.version})`);
process.exit(0);
