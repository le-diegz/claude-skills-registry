#!/usr/bin/env node
/**
 * validate-all.js
 * Finds every skill in skills/ and runs validate-skill.js on each one.
 * Prints a per-skill pass/fail line and a final summary.
 * Exits with code 1 if any skill is invalid (CI-friendly).
 *
 * Usage:
 *   node scripts/validate-all.js
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const VALIDATOR = path.join(REPO_ROOT, "scripts", "validate-skill.js");

// ---------------------------------------------------------------------------
// Skill discovery
// A skill directory is skills/<domain>/<name>/ containing a meta.json.
// ---------------------------------------------------------------------------

function discoverSkillDirs() {
  const skills = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    return skills;
  }

  for (const domainEntry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!domainEntry.isDirectory()) continue;

    const domainDir = path.join(SKILLS_DIR, domainEntry.name);

    for (const skillEntry of fs.readdirSync(domainDir, { withFileTypes: true })) {
      if (!skillEntry.isDirectory()) continue;

      const skillDir = path.join(domainDir, skillEntry.name);

      if (fs.existsSync(path.join(skillDir, "meta.json"))) {
        skills.push(skillDir);
      }
    }
  }

  return skills.sort();
}

// ---------------------------------------------------------------------------
// Run validator on a single skill directory
// Returns { path, name, passed, message }
// ---------------------------------------------------------------------------

function validateSkill(skillDir) {
  const relPath = path.relative(REPO_ROOT, skillDir).replace(/\\/g, "/");

  try {
    const output = execSync(
      `node "${VALIDATOR}" "${skillDir}"`,
      { cwd: REPO_ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    // Extract skill name from "✓ skill valid: <name> (v<version>)"
    const nameMatch = output.match(/✓ skill valid: (\S+)/);
    const name = nameMatch ? nameMatch[1] : path.basename(skillDir);

    return { path: relPath, name, passed: true, message: output };
  } catch (err) {
    // execSync throws when the child process exits with non-zero
    const stderr = (err.stderr ?? "").trim();
    const stdout = (err.stdout ?? "").trim();
    const message = stderr || stdout || err.message;

    return { path: relPath, name: path.basename(skillDir), passed: false, message };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const skillDirs = discoverSkillDirs();

  if (skillDirs.length === 0) {
    console.log("No skills found in skills/. Nothing to validate.");
    process.exit(0);
  }

  console.log(`Validating ${skillDirs.length} skill${skillDirs.length !== 1 ? "s" : ""}…\n`);

  const results = skillDirs.map(validateSkill);

  // Print per-skill results
  for (const result of results) {
    if (result.passed) {
      console.log(`  ✓  ${result.path}`);
    } else {
      console.log(`  ✗  ${result.path}`);
      // Indent each error line for readability
      const indented = result.message
        .split("\n")
        .map((line) => `       ${line}`)
        .join("\n");
      console.log(indented);
    }
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log("");
  console.log("─".repeat(48));

  if (failed === 0) {
    console.log(`✓ ${passed}/${results.length} skills valid`);
    process.exit(0);
  } else {
    console.log(
      `✗ ${passed}/${results.length} skills valid — ${failed} failed`
    );
    process.exit(1);
  }
}

main();
