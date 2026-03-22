#!/usr/bin/env node
/**
 * build-index.js
 * Crawls skills/, validates each meta.json, enriches entries with git history
 * and GitHub repo stats, then writes index.json at the registry root.
 *
 * Usage:
 *   node scripts/build-index.js
 *
 * Env vars:
 *   GITHUB_REPOSITORY  — e.g. "lediegz/claude-skills-registry" (optional)
 *   GITHUB_TOKEN       — Personal Access Token for higher rate limits (optional)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import Ajv from "ajv";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const INDEX_PATH = path.join(REPO_ROOT, "index.json");
const SCHEMA_PATH = path.join(REPO_ROOT, "docs", "meta-schema.json");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GITHUB_REPOSITORY =
  process.env.GITHUB_REPOSITORY ?? "owner/claude-skills-registry";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? null;

// ---------------------------------------------------------------------------
// Schema validator
// ---------------------------------------------------------------------------

function loadValidator() {
  try {
    const raw = fs.readFileSync(SCHEMA_PATH, "utf-8");
    const schema = JSON.parse(raw);
    const ajv = new Ajv({ allErrors: true, strict: false });
    return ajv.compile(schema);
  } catch (err) {
    console.error(`[error] Could not load meta-schema.json: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

/**
 * Returns { sha, date, message } for the last commit touching `dirPath`,
 * or null if git is unavailable or the path has no commits.
 */
function getLastCommit(dirPath) {
  try {
    const rel = path.relative(REPO_ROOT, dirPath);
    const out = execSync(
      `git log -1 --format="%H|%ai|%s" -- "${rel}"`,
      { cwd: REPO_ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (!out) return null;

    // Remove surrounding quotes git sometimes adds
    const clean = out.replace(/^"|"$/g, "");
    const [sha, date, ...rest] = clean.split("|");
    return { sha: sha.trim(), date: date.trim(), message: rest.join("|").trim() };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GitHub API helper
// ---------------------------------------------------------------------------

/**
 * Fetches repo stats from the GitHub REST API.
 * Returns { stars, forks, open_issues } or zeros on failure.
 */
async function fetchRepoStats(repo) {
  const url = `https://api.github.com/repos/${repo}`;
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "claude-skills-registry/build-index",
    ...(GITHUB_TOKEN ? { "Authorization": `Bearer ${GITHUB_TOKEN}` } : {}),
  };

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.warn(
        `[warn] GitHub API returned ${res.status} for ${url}. Stats will be 0.`
      );
      return { stars: 0, forks: 0, open_issues: 0 };
    }

    const data = await res.json();
    return {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      open_issues: data.open_issues_count ?? 0,
    };
  } catch (err) {
    console.warn(`[warn] Could not reach GitHub API: ${err.message}. Stats will be 0.`);
    return { stars: 0, forks: 0, open_issues: 0 };
  }
}

// ---------------------------------------------------------------------------
// Skill discovery
// ---------------------------------------------------------------------------

/**
 * Returns an array of absolute paths to skill directories.
 * A skill directory is any directory two levels deep under skills/
 * (skills/<domain>/<skill-name>/) that contains a meta.json file.
 */
function discoverSkillDirs() {
  const results = [];

  if (!fs.existsSync(SKILLS_DIR)) return results;

  for (const domainEntry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!domainEntry.isDirectory()) continue;

    const domainDir = path.join(SKILLS_DIR, domainEntry.name);

    for (const skillEntry of fs.readdirSync(domainDir, { withFileTypes: true })) {
      if (!skillEntry.isDirectory()) continue;

      const skillDir = path.join(domainDir, skillEntry.name);
      const metaPath = path.join(skillDir, "meta.json");

      if (fs.existsSync(metaPath)) {
        results.push(skillDir);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Skill processing
// ---------------------------------------------------------------------------

/**
 * Reads, validates, and enriches a single skill directory.
 * Returns the enriched skill object or null (with a warning) on failure.
 */
function processSkill(skillDir, validate) {
  const metaPath = path.join(skillDir, "meta.json");
  const relPath = path.relative(REPO_ROOT, skillDir).replace(/\\/g, "/");
  const dirName = path.basename(skillDir);

  // Parse meta.json
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch (err) {
    console.warn(`[skip] ${relPath}: meta.json is not valid JSON — ${err.message}`);
    return null;
  }

  // Validate against schema
  if (!validate(meta)) {
    const errors = validate.errors
      .map((e) => {
        const field = e.instancePath
          ? e.instancePath.replace(/^\//, "")
          : (e.params?.missingProperty ?? "(root)");
        return `${field}: ${e.message}`;
      })
      .join("; ");
    console.warn(`[skip] ${relPath}: meta.json schema errors — ${errors}`);
    return null;
  }

  // name must match directory name
  if (meta.name !== dirName) {
    console.warn(
      `[skip] ${relPath}: meta.json "name" ("${meta.name}") does not match directory name ("${dirName}")`
    );
    return null;
  }

  // Presence flags
  const has_examples =
    fs.existsSync(path.join(skillDir, "examples")) &&
    fs.statSync(path.join(skillDir, "examples")).isDirectory();

  const has_evals =
    fs.existsSync(path.join(skillDir, "evals")) &&
    fs.statSync(path.join(skillDir, "evals")).isDirectory();

  // Git history
  const last_commit = getLastCommit(skillDir);

  return {
    // All validated meta fields first
    ...meta,
    // Enrichment
    path: relPath,
    has_examples,
    has_evals,
    last_commit,
  };
}

// ---------------------------------------------------------------------------
// Stats aggregation
// ---------------------------------------------------------------------------

const ALL_DOMAINS = ["design", "code", "content", "data", "meta"];

function buildStats(skills) {
  const by_domain = Object.fromEntries(ALL_DOMAINS.map((d) => [d, 0]));

  let skills_with_evals = 0;
  let skills_with_examples = 0;

  for (const skill of skills) {
    if (by_domain[skill.domain] !== undefined) {
      by_domain[skill.domain]++;
    }
    if (skill.has_evals) skills_with_evals++;
    if (skill.has_examples) skills_with_examples++;
  }

  return { by_domain, skills_with_evals, skills_with_examples };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const validate = loadValidator();

  // 1. Discover skill directories
  const skillDirs = discoverSkillDirs();

  // 2. Process each skill (skip malformed ones with warnings)
  const skills = skillDirs
    .map((dir) => processSkill(dir, validate))
    .filter(Boolean);

  // Sort alphabetically by path for stable output
  skills.sort((a, b) => a.path.localeCompare(b.path));

  // 3. Stats
  const { by_domain, skills_with_evals, skills_with_examples } = buildStats(skills);

  // 4. GitHub repo stats
  const { stars, forks, open_issues } = await fetchRepoStats(GITHUB_REPOSITORY);

  // 5. Assemble index
  const index = {
    meta: {
      generated_at: new Date().toISOString(),
      total_skills: skills.length,
      by_domain,
      skills_with_evals,
      skills_with_examples,
      stars,
      forks,
      open_issues,
      repo: GITHUB_REPOSITORY,
    },
    skills,
  };

  // 6. Write index.json
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n", "utf-8");

  // 7. Summary
  const domainCount = Object.values(by_domain).filter((n) => n > 0).length;
  const skipped = skillDirs.length - skills.length;

  console.log(
    `Built index.json — ${skills.length} skill${skills.length !== 1 ? "s" : ""} indexed` +
    ` across ${domainCount} domain${domainCount !== 1 ? "s" : ""}` +
    (skipped > 0 ? ` (${skipped} skipped with warnings)` : "")
  );
}

main().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  process.exit(1);
});
