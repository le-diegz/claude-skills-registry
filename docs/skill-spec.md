# Skill Specification — claude-skills-registry

This document is the authoritative reference for creating and contributing skills to the registry.
Read it entirely before writing a skill. Every rule here exists to ensure consistency, discoverability,
and reliability across all contributions.

---

## Table of Contents

1. [Skill Structure](#1-skill-structure)
2. [meta.json Format](#2-metajson-format)
3. [SKILL.md Convention](#3-skillmd-convention)
4. [examples/ Convention](#4-examples-convention)
5. [evals/ Convention](#5-evals-convention)
6. [Naming and Versioning Rules](#6-naming-and-versioning-rules)
7. [Contribution Checklist](#7-contribution-checklist)

---

## 1. Skill Structure

Every skill lives in its own directory under the appropriate domain folder:

```
skills/<domain>/<skill-name>/
├── meta.json          # Required. Machine-readable metadata.
├── SKILL.md           # Required. The prompt and instructions Claude receives.
├── examples/          # Required. At least one input/output pair.
│   ├── example-01/
│   │   ├── input.md
│   │   └── output.md
│   └── example-02/
│       ├── input.md
│       └── output.md
└── evals/             # Required. At least one evaluation pair + rubric.
    ├── rubric.md
    ├── eval-01/
    │   ├── input.md
    │   └── expected.md
    └── eval-02/
        ├── input.md
        └── expected.md
```

**Rules:**
- All four top-level entries (`meta.json`, `SKILL.md`, `examples/`, `evals/`) are required. A skill missing any of them will not be accepted.
- The skill directory name must exactly match the `name` field in `meta.json`.
- No other files or directories should be added at the skill root level unless documented in this spec.

---

## 2. meta.json Format

`meta.json` is a flat JSON object. All fields listed below are required unless marked optional.

```json
{
  "name": "figma-to-tailwind",
  "version": "1.0.0",
  "description": "Converts a Figma component description into production-ready Tailwind CSS markup.",
  "trigger": "Activate this skill when the user provides a Figma design description, shares Figma component specs, or asks to implement a UI component matching a Figma file. Do not activate for generic CSS questions unrelated to a Figma source.",
  "domain": "design",
  "tags": ["figma", "tailwind", "css", "ui", "component"],
  "author": "lediegz",
  "model_compatibility": ["claude-sonnet-4-6", "claude-opus-4-6"],
  "requires_tools": ["Read", "Write"],
  "license": "MIT"
}
```

### Field Reference

#### `name`
- **Type:** `string`
- **Format:** kebab-case, lowercase, alphanumeric and hyphens only
- **Constraint:** Must be unique across the entire registry. Must match the skill's directory name.
- **Examples:** `figma-to-tailwind`, `sql-query-builder`, `commit-message-writer`
- **Invalid:** `FigmaToTailwind`, `figma_to_tailwind`, `figma to tailwind`

#### `version`
- **Type:** `string`
- **Format:** Semantic versioning — `MAJOR.MINOR.PATCH`
- **Rule:** New skills start at `1.0.0`. See [Naming and Versioning Rules](#6-naming-and-versioning-rules) for increment guidelines.
- **Examples:** `1.0.0`, `1.2.0`, `2.0.0`

#### `description`
- **Type:** `string`
- **Format:** One sentence. Starts with a verb. Describes the output, not the process.
- **Constraint:** Maximum 120 characters.
- **Examples:**
  - `"Converts a Figma component description into production-ready Tailwind CSS markup."`
  - `"Generates a conventional commit message from a git diff."`
- **Invalid:** `"This skill helps you when you want to..."`, `"A tool for doing X and Y and also Z and sometimes W."`

#### `trigger`
- **Type:** `string`
- **Format:** 2–3 sentences. First sentence: when to activate. Second sentence: boundary condition (when NOT to activate). Third sentence (optional): disambiguation from similar skills.
- **Purpose:** This field is read by Claude to decide whether to invoke the skill. Be precise — vague triggers cause false positives.
- **Example:**
  ```
  "Activate this skill when the user provides a Figma design description, shares Figma component specs,
  or asks to implement a UI component matching a Figma file. Do not activate for generic CSS questions
  unrelated to a Figma source. If the user provides both a Figma spec and a backend requirement,
  activate this skill only for the UI portion."
  ```

#### `domain`
- **Type:** `string`
- **Allowed values:** `design` | `code` | `content` | `data` | `meta`
- **Definitions:**
  - `design` — UI, UX, visual design, design systems, Figma workflows
  - `code` — software engineering, refactoring, debugging, code generation
  - `content` — writing, editing, documentation, copywriting, translation
  - `data` — data analysis, SQL, transformations, visualization, pipelines
  - `meta` — skills about skills, registry tooling, Claude configuration
- **Rule:** Choose the single most relevant domain. If genuinely ambiguous, prefer the domain of the *output* over the domain of the *input*.

#### `tags`
- **Type:** `array of strings`
- **Format:** lowercase, kebab-case strings
- **Constraint:** Between 2 and 8 tags. Tags must be specific — avoid generic terms like `"tool"`, `"helper"`, `"utility"`.
- **Example:** `["figma", "tailwind", "react", "component"]`

#### `author`
- **Type:** `string`
- **Format:** GitHub handle, without the `@` prefix
- **Example:** `"lediegz"`

#### `model_compatibility`
- **Type:** `array of strings`
- **Allowed values:** `"claude-sonnet-4-6"` | `"claude-opus-4-6"` | `"claude-haiku-4-5"`
- **Rule:** List every model the skill has been tested and confirmed to work with. Do not list models you have not tested. Haiku should only be listed if the skill works reliably with its reduced capability.
- **Example:** `["claude-sonnet-4-6", "claude-opus-4-6"]`

#### `requires_tools`
- **Type:** `array of strings`
- **Allowed values:** Any tool name from the Claude Code toolset (e.g. `"Read"`, `"Write"`, `"Bash"`, `"Glob"`, `"Grep"`, `"WebFetch"`, `"WebSearch"`)
- **Rule:** List only tools that are essential for the skill to function. Can be an empty array `[]` if the skill requires no tools.
- **Examples:** `["Read", "Write"]`, `["Bash"]`, `[]`

#### `license`
- **Type:** `string`
- **Allowed values:** Any [SPDX license identifier](https://spdx.org/licenses/)
- **Recommendation:** `"MIT"` for most skills. Use `"CC-BY-4.0"` for content-only skills.
- **Example:** `"MIT"`

---

## 3. SKILL.md Convention

`SKILL.md` is the file Claude reads when the skill is invoked. Write it as direct instructions to Claude, not as documentation for humans.

### Frontmatter

Every `SKILL.md` must begin with YAML frontmatter:

```markdown
---
name: figma-to-tailwind
description: Converts a Figma component description into production-ready Tailwind CSS markup.
---
```

- `name` must match `meta.json → name` exactly.
- `description` must match `meta.json → description` exactly.
- No additional frontmatter fields are allowed.

### Required Sections

The body of `SKILL.md` must contain these four sections, in this order, with these exact headings:

---

#### `## When to use this skill`

Describe the conditions under which Claude should apply this skill. Be specific about inputs, user intent, and context signals. This is a human-readable expansion of the `trigger` field in `meta.json`.

```markdown
## When to use this skill

Use this skill when:
- The user shares a Figma component description, a screenshot of a Figma frame, or specs exported from Figma.
- The user asks to "implement a design", "build this component", or "translate this to Tailwind".
- The user provides a Figma URL and asks for code.

Do not use this skill when:
- The user asks a general CSS or layout question without referencing a design source.
- The user is debugging existing Tailwind code unrelated to a Figma design.
```

#### `## Instructions`

The core prompt. Write in imperative sentences addressed directly to Claude. Be prescriptive — tell Claude exactly what to do, in what order, at what level of detail. Do not explain *why* unless the reasoning directly affects Claude's output decisions.

```markdown
## Instructions

1. Read the Figma component description provided by the user. Identify the component type,
   visual properties (color, spacing, typography), and interactive states.

2. Map each visual property to the closest Tailwind utility class. Use the following priority:
   - Exact match first (e.g. `text-sm` for 14px font)
   - Arbitrary value second (e.g. `text-[13px]`) only if no utility class is within 1 design token
   - Never use inline styles

3. Output a single, self-contained JSX component. Use functional component syntax.
   Export the component as default. Do not add prop-types or TypeScript unless the user's
   existing codebase uses them.

4. After the component, add a short comment block listing any Tailwind classes that required
   arbitrary values, and why.
```

#### `## Examples`

Provide 1–2 inline examples that show the expected input/output pattern. These help Claude calibrate its output format before it sees the `examples/` directory.

```markdown
## Examples

**Input:**
> Button component, primary variant. Background: #3B82F6, text: white, padding: 12px 24px,
> border-radius: 8px, font-weight: 600. Hover: background darkens to #2563EB.

**Output:**
```jsx
export default function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold
                 py-3 px-6 rounded-lg transition-colors"
    >
      {children}
    </button>
  );
}
```
```

#### `## What to avoid`

An explicit list of anti-patterns, failure modes, or common mistakes Claude should not make when executing this skill.

```markdown
## What to avoid

- Do not use `@apply` or custom CSS — output must be pure Tailwind utility classes.
- Do not invent design tokens that weren't in the input (e.g. do not add shadows
  unless the Figma spec includes them).
- Do not wrap the component in a `<div>` container unless the spec explicitly includes one.
- Do not add accessibility attributes (aria-*) unless the user's spec mentions them.
- Do not output multiple file variants — produce exactly one component.
```

### Writing Rules

- **Address Claude directly.** Write "Do X", not "The skill should X" or "Claude will X".
- **Be prescriptive, not descriptive.** Tell Claude what to do, not what the skill is about.
- **Use numbered lists for sequential steps.** Use bullet lists for parallel options or constraints.
- **Give concrete examples, not abstract descriptions.** "Use `text-sm` for 14px" beats "map font sizes to Tailwind classes".
- **State boundaries explicitly.** Always include what the skill does *not* do.
- **No filler.** Every sentence must constrain or direct behavior. Remove any sentence that Claude could ignore without changing its output.

---

## 4. examples/ Convention

The `examples/` directory contains concrete input/output pairs that demonstrate correct skill behavior.

### Structure

```
examples/
├── example-01/
│   ├── input.md
│   └── output.md
└── example-02/
    ├── input.md
    └── output.md
```

- Subdirectories are named `example-NN` with zero-padded two-digit numbers starting at `01`.
- Each subdirectory must contain exactly two files: `input.md` and `output.md`.
- No other files are allowed inside example subdirectories.
- **Minimum:** 1 example. **Recommended:** 2–3 examples covering distinct input variations.

### input.md

Contains exactly what a user would send to Claude to trigger the skill. Write it as a realistic user message — include context, formatting, and any relevant code or data the user would provide.

```markdown
Convert this Figma spec to Tailwind:

Component: Badge
Variants: success (green), warning (yellow), error (red)
Size: small — padding 4px 8px, font-size 12px, font-weight 500
Border-radius: 9999px (pill shape)
No border. No shadow.
```

### output.md

Contains the exact output Claude should produce. Must be complete, copy-pasteable, and match the format specified in `SKILL.md`.

```markdown
```jsx
export default function Badge({ variant = "success", children }) {
  const styles = {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error:   "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full
                      text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
```
```

**Rules for examples:**
- Examples must be realistic, not toy inputs. Use real values, real constraints.
- `output.md` must represent the ideal output, not an acceptable one. It is the gold standard.
- Each example should illustrate a distinct scenario — do not repeat the same input type with minor variations.

---

## 5. evals/ Convention

The `evals/` directory contains evaluation pairs used to test skill quality programmatically or during review.

### Structure

```
evals/
├── rubric.md
├── eval-01/
│   ├── input.md
│   └── expected.md
└── eval-02/
    ├── input.md
    └── expected.md
```

- `rubric.md` is required at the root of `evals/`. It contains the quality criteria.
- Subdirectories follow the same pattern as `examples/`: `eval-NN`, zero-padded, starting at `01`.
- Each subdirectory contains `input.md` and `expected.md`.
- **Minimum:** 2 evals. Evals should test edge cases and failure boundaries, not just the happy path.

### rubric.md

Defines the criteria by which Claude's output should be judged. Structure it as a checklist with pass/fail criteria. Each criterion must be independently verifiable.

```markdown
# Evaluation Rubric — figma-to-tailwind

## Required (all must pass)

- [ ] Output contains a valid JSX functional component
- [ ] Component is exported as default
- [ ] No inline styles are used (`style={{...}}` is a failure)
- [ ] All visual properties from the input spec are reflected in the output
- [ ] No Tailwind classes are used that were not derivable from the input spec
- [ ] Arbitrary values (`text-[Npx]`) are only used when no standard class is within 1 token

## Recommended (failure is a warning, not a block)

- [ ] Comment block lists any arbitrary values used and why
- [ ] Component accepts `children` as a prop if the spec includes text content
- [ ] Transition classes are added for hover states
```

### eval-NN/input.md and expected.md

Same format rules as `examples/` — but evals should deliberately probe edge cases:

- Ambiguous or incomplete specs
- Properties that have no direct Tailwind equivalent
- Components with multiple states or variants
- Inputs that should produce a clarifying question rather than code

```markdown
<!-- eval-02/input.md — edge case: ambiguous spacing -->
Convert this to Tailwind:

Card component. Padding: 20px. No other specs provided.
```

```markdown
<!-- eval-02/expected.md — expected: Claude asks for clarification -->
Before generating the component, I need a few details:

1. What is the card's background color?
2. Does it have a border or shadow?
3. What content does it contain (text, image, actions)?

Once you provide these, I'll generate the complete Tailwind component.
```

---

## 6. Naming and Versioning Rules

### Skill Names

- Format: `kebab-case`, all lowercase
- Must describe what the skill *does*, not what it *is*
- Use a verb-noun pattern when possible: `generate-X`, `convert-X-to-Y`, `review-X`, `extract-X`
- Maximum 40 characters
- Must be unique across the entire registry (enforced by CI)

| Good | Bad |
|---|---|
| `commit-message-writer` | `commitMessages` |
| `figma-to-tailwind` | `figma` |
| `sql-query-builder` | `sql-tool` |
| `api-response-formatter` | `formatter` |

### Versioning

Follow [Semantic Versioning](https://semver.org/):

| Change | Version bump |
|---|---|
| New skill | `1.0.0` |
| Add a new example or eval | `PATCH` → `1.0.1` |
| Refine instructions without changing behavior | `PATCH` → `1.0.1` |
| Change instructions in a way that affects output | `MINOR` → `1.1.0` |
| Add a new required field to `meta.json` | `MINOR` → `1.1.0` |
| Change the skill's domain or core purpose | `MAJOR` → `2.0.0` |
| Breaking change to the expected output format | `MAJOR` → `2.0.0` |

When you bump the version in `meta.json`, you must also update `index.json` at the registry root.
The CI pipeline will reject a PR where `meta.json` version and `index.json` are out of sync.

### Directory Naming

The skill directory name must be identical to `meta.json → name`. No exceptions.

```
skills/design/figma-to-tailwind/   ✓   name: "figma-to-tailwind"
skills/design/figmaToTailwind/     ✗
skills/design/figma_to_tailwind/   ✗
```

---

## 7. Contribution Checklist

Before opening a pull request, verify every item below. PRs that fail these checks will be closed without review.

### Structure

- [ ] Skill lives under the correct domain directory (`skills/<domain>/<skill-name>/`)
- [ ] Directory name matches `meta.json → name` exactly
- [ ] All four required entries are present: `meta.json`, `SKILL.md`, `examples/`, `evals/`
- [ ] `examples/` contains at least one `example-NN/` subdirectory with `input.md` and `output.md`
- [ ] `evals/` contains `rubric.md` and at least two `eval-NN/` subdirectories with `input.md` and `expected.md`
- [ ] No extra files have been added at the skill root level

### meta.json

- [ ] All required fields are present and non-empty
- [ ] `name` is kebab-case and matches the directory name
- [ ] `version` is valid semver and starts at `1.0.0` for new skills
- [ ] `description` is a single sentence, starts with a verb, is under 120 characters
- [ ] `trigger` contains 2–3 sentences including a boundary condition
- [ ] `domain` is one of the five allowed values
- [ ] `tags` contains between 2 and 8 items, all lowercase kebab-case
- [ ] `author` is your GitHub handle without `@`
- [ ] `model_compatibility` lists only models you have personally tested
- [ ] `requires_tools` is present (can be `[]`)
- [ ] `license` is a valid SPDX identifier
- [ ] `index.json` at the registry root has been updated with this skill's entry

### SKILL.md

- [ ] Frontmatter is present with `name` and `description` matching `meta.json`
- [ ] All four required sections are present with exact headings
- [ ] Instructions are written directly to Claude in imperative form
- [ ] At least one inline example is included in the `## Examples` section
- [ ] `## What to avoid` contains at least three specific anti-patterns

### Examples

- [ ] Each `input.md` is a realistic user message, not a toy prompt
- [ ] Each `output.md` represents the ideal output, not just an acceptable one
- [ ] At least two examples cover distinct input scenarios

### Evals

- [ ] `rubric.md` distinguishes between required and recommended criteria
- [ ] All rubric criteria are independently verifiable (no subjective criteria without a benchmark)
- [ ] At least one eval tests an edge case or boundary condition
- [ ] `expected.md` files are complete and unambiguous

### Final Checks

- [ ] You have run the skill against each `evals/` input and Claude's output passes the rubric
- [ ] The skill has been tested on every model listed in `model_compatibility`
- [ ] No sensitive data (API keys, personal information, proprietary content) appears in any file
- [ ] PR title follows the format: `feat(domain): add <skill-name>` for new skills, `fix(domain): <skill-name> — <description>` for updates
