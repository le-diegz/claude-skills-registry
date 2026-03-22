---
name: skill-creator
description: Creates well-scoped, spec-compliant registry skills with prescriptive instructions and high-quality examples.
---

## When to use this skill

Use this skill when:
- The user wants to create a new skill for the claude-skills-registry and asks for help generating the skill files.
- The user describes a workflow, prompt, or capability they use repeatedly and wants to turn it into a registerable skill.
- The user asks "how do I write a skill", "help me write SKILL.md", or "create a skill for X".

Do not use this skill when:
- The user wants to modify or improve an existing skill (that is a different workflow — read the existing skill first, then propose changes with a version bump).
- The user is asking general questions about prompting or Claude's capabilities without intending to register a skill.
- The user wants to create a system prompt or one-off prompt, not a reusable registry skill.

---

## Instructions

### Step 1 — Read docs/skill-spec.md before producing any output

Read the full specification at `docs/skill-spec.md`. Do not produce any skill files until you have read it. The spec is the authoritative source; these instructions are a workflow layer on top of it.

If you cannot read the file (the tool is unavailable), ask the user to paste the relevant sections before continuing.

### Step 2 — Determine the skill's scope before writing anything

The most common mistake in skill authorship is wrong scope — usually too broad. Before writing a single line of SKILL.md, answer these three questions internally:

**1. Can you complete the output in one session without user input mid-way?**
If the answer is no, the skill is too broad. Split it.

- Too broad: `code-improver` (improve code — which dimension? performance, security, style, architecture?)
- Right scope: `code-reviewer` (review code and produce prioritized, actionable comments)
- Right scope: `performance-profiler` (analyze code for performance bottlenecks)

**2. Can you write a rubric with 5 independently verifiable pass/fail criteria?**
If the criteria are subjective or overlap, the skill is not specific enough.

- Bad criterion: "The output is high quality"
- Good criterion: "Every comment includes a code example showing the fix"

**3. Can you write a one-sentence description that starts with a verb and is under 120 characters?**
If you cannot, the skill either does too many things or is defined by its input rather than its output.

- Too broad: "Helps with various writing tasks including editing, restructuring, and improving tone"
- Right scope: "Rewrites technical prose to remove passive voice and reduce sentence length by at least 20%"

If scope is unclear, ask the user one question: "What is the single most important thing this skill produces?"

### Step 3 — Generate meta.json first

Generate the complete `meta.json` using the spec's field reference. Key decisions:

**`trigger` field:** Write 2–3 sentences. The first sentence must describe the specific user signal that activates the skill. The second sentence must be a boundary condition — what looks similar but should NOT activate the skill. A trigger without a boundary condition will produce false positives.

**`tags` field:** Choose tags that describe the output, not the process. Tags like "helpful", "tool", "assistant" are forbidden. Tags like "code-review", "sql", "api-reference" describe what the skill produces.

**`model_compatibility`:** Only list models you or the user have tested. If the user hasn't tested, default to `["claude-sonnet-4-6"]` and note that other models are untested.

Show the generated `meta.json` to the user and ask for confirmation before proceeding to SKILL.md.

### Step 4 — Write SKILL.md as a sequence of precise instructions

Structure SKILL.md with the four required sections in order. For each section, apply these rules:

**`## When to use this skill`:**
List 3–5 specific activation signals as bullets. List 2–3 explicit non-activation conditions. Make each bullet a concrete scenario, not a category.

- Bad: "The user wants help with code"
- Good: "The user shares a function and asks for review, feedback, or a second opinion"

**`## Instructions`:**
Write numbered steps that tell Claude exactly what to do, in what order. Each step must:
- Start with an imperative verb
- Describe a concrete action
- Include at least one example of good/bad output where the step could be applied ambiguously

Do not describe what the skill is. Every sentence must constrain behavior.

Count the steps. If there are more than 8 steps, group them. If there are fewer than 3, the skill is probably too narrow to be a skill.

**`## Examples`:**
Include one inline example with a concrete input and the full expected output. The example must:
- Use a realistic input (not "write a function that adds two numbers")
- Show the complete output, not a summary of it
- Represent the median use case, not the simplest possible case

**`## What to avoid`:**
List at least 5 anti-patterns. Each must be specific to this skill — not generic advice. Frame each as "Do not X" followed by either what to do instead or why X is a problem.

### Step 5 — Generate examples/ directory content

For `example-01/input.md`:
- Write a realistic user message that would trigger the skill
- Include enough context for Claude to produce a complete output
- Do not use toy inputs ("write hello world", "create a simple button")

For `example-01/output.md`:
- Write the complete, ideal output — not a summary, not a skeleton
- The output must satisfy every criterion in evals/rubric.md
- If the output is long, do not truncate it. The output.md is the gold standard.

Generate two examples that cover distinct scenarios. Example-01 should be the most common case. Example-02 should be a variation — different input type, different complexity, different edge of the skill's scope.

### Step 6 — Generate evals/ directory content

For `evals/rubric.md`:
Write criteria in two sections: Required and Recommended.

Required criteria must be:
- Binary (pass or fail, not "mostly passes")
- Verifiable by reading the output text (no subjective judgment)
- Specific to this skill (not generic quality criteria)

Minimum 5 Required criteria, minimum 2 Recommended criteria.

For `evals/eval-01/`:
- `input.md`: the happy path — the most common, unambiguous use case
- `expected.md`: what a perfect output looks like, with enough detail to judge a real output against it

For `evals/eval-02/`:
- `input.md`: an edge case — an ambiguous input, a boundary condition, or a case where the skill should ask a clarifying question rather than producing output
- `expected.md`: the expected handling of the edge case

---

## Examples

**Input:**
> I want to create a skill called `sql-query-builder`. It should help Claude write SQL queries from natural language descriptions.

**Output:**

Before I generate the files, let me check the scope.

The description "write SQL queries from natural language" covers a wide range — simple SELECTs, multi-table JOINs, window functions, CTEs, performance-aware queries, dialect-specific syntax. I'll scope this to: generating correct, readable SQL SELECT queries from a plain-English description of what data the user wants, given a schema. It will not cover INSERT/UPDATE/DELETE, schema design, or query optimization (those are separate skills).

One question: which SQL dialect should be the default — ANSI SQL, PostgreSQL, or MySQL? I'll default to PostgreSQL if you don't have a preference.

---

**`meta.json`** (pending your confirmation):

```json
{
  "name": "sql-query-builder",
  "version": "1.0.0",
  "description": "Generates correct, readable SQL SELECT queries from a plain-English description and a provided schema.",
  "trigger": "Activate this skill when the user describes what data they want to retrieve and provides a database schema, table names, or column names. Do not activate for INSERT, UPDATE, or DELETE queries, schema design tasks, or query performance optimization.",
  "domain": "data",
  "tags": ["sql", "query", "postgresql", "database", "select"],
  "author": "your-handle",
  "model_compatibility": ["claude-sonnet-4-6"],
  "requires_tools": [],
  "license": "MIT"
}
```

Does this scope and these fields look right? Once confirmed I'll generate SKILL.md and the examples.

---

## What to avoid

- Do not generate skill files without reading `docs/skill-spec.md` first. The spec defines required fields, allowed enum values, and structural constraints that are not in these instructions.
- Do not accept a skill scope that is too broad. "Helps with writing" is not a skill. If the user insists on a broad scope, generate the skill for the most specific and common sub-task, and note what adjacent skills could handle the rest.
- Do not write SKILL.md instructions as descriptions of the skill. "This skill will analyze your code" is not an instruction. "Read every function signature before commenting on any implementation detail" is an instruction.
- Do not write `trigger` fields without a boundary condition. A trigger that says only when to activate — with no "do not activate when" sentence — will cause false positives.
- Do not produce toy examples. An example-01 input of "Write a function that adds two numbers" for a `code-reviewer` skill tells Claude nothing about how to handle a real review.
- Do not generate rubric criteria that require subjective judgment. "The output is well-written" is not a rubric criterion. "Every comment includes a code snippet showing the corrected version" is.
- Do not truncate output.md files with "...and so on". The output must be complete. A truncated gold standard cannot be used to evaluate a real output.
