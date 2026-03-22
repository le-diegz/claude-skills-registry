# Contributing to claude-skills-registry

Welcome — and thank you for considering a contribution.

This registry exists because the quality of a Claude skill depends almost entirely on
how well it is specified. Every skill here is a small, focused piece of work that makes
Claude meaningfully better at a specific task. That bar is worth maintaining.

This guide walks you through everything you need: philosophy, setup, creating a skill,
improving one, and the standards a PR must meet to be accepted.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Prerequisites](#2-prerequisites)
3. [Local setup](#3-local-setup)
4. [Creating a new skill](#4-creating-a-new-skill)
5. [Improving an existing skill](#5-improving-an-existing-skill)
6. [Quality standards](#6-quality-standards)
7. [Code of conduct](#7-code-of-conduct)

---

## 1. Philosophy

### What a skill is

A skill is a precisely scoped prompt that tells Claude exactly what to do, when to do
it, and — just as importantly — when not to. It is not a system prompt, not a workflow,
and not a chatbot persona. It is a single, repeatable capability.

A good skill has three properties:

**Specificity.** It solves one problem well. `commit-message-writer` is a skill.
"Help with git" is not. If you find yourself writing "it depends on the situation"
anywhere in `SKILL.md`, the skill is probably too broad.

**Reliability.** Given the same input, Claude should produce the same category of output
every time. This means the instructions must be prescriptive, not suggestive. "Consider
using Tailwind classes" is not an instruction. "Map every spacing value to the nearest
Tailwind utility class; use arbitrary values only when no standard class is within one
design token" is.

**Testability.** You must be able to write an eval that passes or fails without
subjective judgment. If you cannot write a rubric for a skill, the skill is not yet
specific enough.

### What separates a quality skill from a generic one

| Quality skill | Generic skill |
|---|---|
| Trigger describes exact user signals | Trigger is a vague topic area |
| Instructions are numbered, sequential, imperative | Instructions are prose descriptions |
| "What to avoid" lists concrete anti-patterns | "What to avoid" is empty or obvious |
| Examples use realistic inputs with real values | Examples use toy inputs ("Hello world") |
| Evals test edge cases and boundary conditions | Evals only test the happy path |
| `description` starts with a verb and fits in 120 chars | `description` is a paragraph |

If you are unsure whether your skill meets the bar, read an existing high-quality skill
in the registry before submitting.

---

## 2. Prerequisites

- **Node.js 20 or later** — required to run the validator and index builder
- **npm** — comes with Node.js
- **git** — required; the index builder uses `git log` to enrich skill metadata
- **A GitHub account** — for fork, branch, and PR

**Recommended:**
- VS Code with the Claude Code extension — lets you test skills interactively
  before writing evals

Check your versions:

```bash
node --version   # must be >= 20.0.0
npm --version
git --version
```

---

## 3. Local setup

```bash
git clone https://github.com/your-fork/claude-skills-registry.git
cd claude-skills-registry
npm install
node scripts/validate-skill.js --help   # smoke test
```

That is it. There is no build step, no database, no environment variables required
for local development.

---

## 4. Creating a new skill

### Step 1 — Fork and clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/<your-handle>/claude-skills-registry.git
cd claude-skills-registry
git checkout -b feat/add-<skill-name>
```

One branch per skill. Do not batch multiple new skills into a single PR.

### Step 2 — Create the skill directory

Choose the right domain (`design`, `code`, `content`, `data`, or `meta`) and create
your skill directory. The name must be kebab-case, max 40 characters, and unique in
the registry.

```bash
mkdir -p skills/code/commit-message-writer/{examples/example-01,examples/example-02,evals/eval-01,evals/eval-02}
touch skills/code/commit-message-writer/meta.json
touch skills/code/commit-message-writer/SKILL.md
touch skills/code/commit-message-writer/evals/rubric.md
```

**Naming rules:**
- Use a verb-noun pattern: `generate-X`, `convert-X-to-Y`, `review-X`, `extract-X`
- All lowercase, hyphens only — no underscores, no camelCase
- The directory name must match `meta.json → name` exactly

```
Good:  commit-message-writer    sql-query-builder    figma-to-tailwind
Bad:   commitMessages           sql                  figma_to_tailwind
```

### Step 3 — Fill in meta.json

All fields are required. Copy this template and fill every value:

```json
{
  "name": "commit-message-writer",
  "version": "1.0.0",
  "description": "Generates a conventional commit message from a staged git diff.",
  "trigger": "Activate this skill when the user shares a git diff or asks for help writing a commit message. Do not activate for general git questions or branch management tasks.",
  "domain": "code",
  "tags": ["git", "commit", "conventional-commits", "changelog"],
  "author": "your-github-handle",
  "model_compatibility": ["claude-sonnet-4-6", "claude-opus-4-6"],
  "requires_tools": [],
  "license": "MIT"
}
```

Common mistakes:
- `description` must start with a verb and be under 120 characters
- `trigger` must include at least one boundary condition ("Do not activate when...")
- `tags` must have 2–8 items, all lowercase kebab-case
- `model_compatibility` must only list models you have personally tested
- `author` is your GitHub handle without the `@`

### Step 4 — Write SKILL.md

`SKILL.md` is read directly by Claude when the skill is invoked. Write it as
instructions to Claude, not as documentation for humans.

**Required frontmatter** (must match meta.json exactly):

```markdown
---
name: commit-message-writer
description: Generates a conventional commit message from a staged git diff.
---
```

**Required sections** (in this order, with these exact headings):

```markdown
## When to use this skill
## Instructions
## Examples
## What to avoid
```

Key rules for `SKILL.md`:
- Address Claude directly. Write "Do X", not "Claude should X" or "The skill will X"
- Use numbered lists for sequential steps, bullet lists for parallel constraints
- Every sentence must constrain or direct behavior — remove anything Claude could
  ignore without changing its output
- "What to avoid" must contain at least three concrete anti-patterns, not vague warnings

### Step 5 — Add examples

Each example lives in its own subdirectory under `examples/`:

```
examples/example-01/input.md    ← what the user sends
examples/example-01/output.md   ← what Claude produces (ideal, not just acceptable)
```

Rules:
- `input.md` must be a realistic user message — use real values, not toy inputs
- `output.md` is the gold standard, not a "good enough" output
- Aim for 2–3 examples that cover distinct scenarios, not variations of the same input

```bash
# Example: write a realistic input
cat > skills/code/commit-message-writer/examples/example-01/input.md << 'EOF'
Here is my staged diff:

diff --git a/src/auth/token.ts b/src/auth/token.ts
@@ -12,6 +12,19 @@ export function verifyToken(token: string) {
+export function refreshToken(token: string, secret: string): string {
+  const payload = verifyToken(token);
+  return jwt.sign({ userId: payload.userId }, secret, { expiresIn: "7d" });
+}

What commit message should I use?
EOF
```

### Step 6 — Add evals

Evals are how reviewers and CI verify that the skill does what it claims.
They must probe edge cases, not just the happy path.

```
evals/rubric.md        ← quality criteria with Required / Recommended sections
evals/eval-01/input.md
evals/eval-01/expected.md
evals/eval-02/input.md      ← at least one eval must test an edge case
evals/eval-02/expected.md
```

`rubric.md` structure:

```markdown
# Evaluation Rubric — commit-message-writer

## Required (all must pass)

- [ ] Output follows Conventional Commits format: <type>(<scope>): <subject>
- [ ] Type is one of: feat, fix, docs, style, refactor, test, chore
- [ ] Subject line is under 72 characters and does not end with a period
- [ ] No placeholder text appears in the output

## Recommended (failure is a warning, not a block)

- [ ] Body is included when the diff contains non-trivial logic changes
- [ ] Breaking changes are flagged with BREAKING CHANGE in the footer
```

### Step 7 — Validate locally

Run the validator against your skill before pushing:

```bash
node scripts/validate-skill.js skills/code/commit-message-writer
```

Expected output on success:

```
✓ skill valid: commit-message-writer (v1.0.0)
```

If the validator reports errors, fix each one before continuing. The CI pipeline runs
this same check on every PR — there is no way to merge a skill that fails validation.

Also rebuild the index so `index.json` reflects your new skill:

```bash
node scripts/build-index.js
```

### Step 8 — Open the PR

Push your branch and open a pull request against `main`:

```bash
git add skills/code/commit-message-writer index.json
git commit -m "feat(code): add commit-message-writer"
git push origin feat/add-commit-message-writer
```

PR title format:
- New skill: `feat(domain): add <skill-name>`
- Improvement: `fix(domain): <skill-name> — <short description>`

Fill in the PR template completely. Every required checkbox in the template must be
checked before requesting a review. PRs with incomplete checklists will not be reviewed.

---

## 5. Improving an existing skill

Found a skill that produces incorrect output, misses an edge case, or has outdated
instructions? Improvements are welcome. Here is how to handle versioning.

### Patch bump — `1.0.0 → 1.0.1`

For changes that do not affect Claude's output:
- Fix a typo in `SKILL.md` or `meta.json`
- Add a new example or eval without changing instructions
- Update tags or model_compatibility

```bash
# Update version in meta.json, then rebuild the index
node scripts/build-index.js
```

### Minor bump — `1.0.0 → 1.1.0`

For changes that improve or extend behavior without breaking existing outputs:
- Add or refine instructions that cover a previously unhandled case
- Add new examples that demonstrate new input types
- Add a new required field to meta.json

### Major bump — `1.0.0 → 2.0.0`

For changes that break compatibility with previous outputs:
- Change the expected output format or structure
- Change the skill's domain or core purpose
- Remove or rename required output fields

When you bump the version in `meta.json`, you must also run `node scripts/build-index.js`
to update `index.json`. The CI pipeline rejects PRs where the two are out of sync.

### Opening an improvement PR

```bash
git checkout -b fix/code/commit-message-writer-breaking-change-footer
# make your changes
node scripts/validate-skill.js skills/code/commit-message-writer
node scripts/build-index.js
git add skills/code/commit-message-writer index.json
git commit -m "fix(code): commit-message-writer — handle BREAKING CHANGE footer"
git push origin fix/code/commit-message-writer-breaking-change-footer
```

If you are improving a skill you did not author, consider opening an issue first
to discuss the change with the original author before writing code.

---

## 6. Quality standards

### What gets a PR accepted

- The validator passes with no errors: `✓ skill valid: <name>`
- `SKILL.md` is written directly to Claude, not about Claude
- Examples use realistic inputs — real values, real constraints
- At least one eval covers an edge case or boundary condition
- The rubric has at least three independently verifiable Required criteria
- The skill was tested on all models listed in `model_compatibility`
- `index.json` is up to date

### What gets a PR rejected

These are the most common reasons for rejection. Avoiding them before you submit
saves time for everyone.

**Scope too broad.** A skill that does "anything related to authentication" will be
rejected. Narrow it to one specific, repeatable task.

**Instructions that describe instead of direct.** If `SKILL.md` reads like a feature
description rather than a prompt, it will be rejected. Every sentence must be an
instruction that changes Claude's behavior.

**Toy examples.** `input.md` files that contain "Hello, please help me" or
"Create a simple component" are not examples — they are placeholders. Reviewers
need to see how the skill handles real-world inputs.

**Empty "What to avoid" section.** This section must contain at least three
concrete anti-patterns. "Don't make mistakes" is not an anti-pattern.

**Untested model compatibility.** If you list `claude-haiku-4-5` in
`model_compatibility` but have not actually tested it, the skill will be sent back.
Only list models you have verified produce correct output.

**Missing evals.** Examples show what good looks like. Evals verify that the skill
actually achieves it. Both are required.

### Response time

Reviewers aim to give initial feedback within a week. If your PR has been open for
more than two weeks with no response, it is fine to leave a comment asking for a review.

---

## 7. Code of conduct

This project follows a standard contributor code of conduct. See
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for the full text.

The short version: be direct, be constructive, assume good faith. Feedback on skills
should be about the work, not the person. If you disagree with a review decision,
explain your reasoning — don't escalate.

Questions that are not bug reports or PRs belong in
[GitHub Discussions](https://github.com/owner/claude-skills-registry/discussions),
not in issues.
