# Evaluation Rubric — skill-creator

---

## Required (all must pass)

### Scope check
- [ ] Before generating files, the response identifies whether the requested scope is too broad, too narrow, or appropriate — and states the decision.
- [ ] If the scope is too broad, the response proposes a narrower scope and explains the boundary.
- [ ] The response confirms (or asks the user to confirm) `meta.json` before generating `SKILL.md`.

### meta.json correctness
- [ ] All 10 required fields are present: `name`, `version`, `description`, `trigger`, `domain`, `tags`, `author`, `model_compatibility`, `requires_tools`, `license`.
- [ ] `trigger` contains at least one boundary condition ("Do not activate when...").
- [ ] `description` starts with a verb and is under 120 characters.
- [ ] `domain` is one of: `design`, `code`, `content`, `data`, `meta`.

### SKILL.md correctness
- [ ] All four required sections are present with exact headings: `## When to use this skill`, `## Instructions`, `## Examples`, `## What to avoid`.
- [ ] `## Instructions` contains numbered, imperative steps — not prose descriptions.
- [ ] `## What to avoid` contains at least 5 skill-specific anti-patterns (not generic advice).
- [ ] At least one inline example is present in `## Examples` with a concrete input and complete output.

### Example quality
- [ ] Suggested `example-01/input.md` is a realistic user message — not a toy prompt.
- [ ] Suggested `example-01/output.md` is a complete output — not a summary or skeleton.

### Rubric quality
- [ ] The generated rubric has both Required and Recommended sections.
- [ ] Every Required criterion is binary and verifiable by reading the output text.
- [ ] No Required criterion requires subjective judgment ("the output is good").

---

## Recommended (failure is a warning, not a block)

- [ ] The response explains its scoping decision before generating files.
- [ ] The response proposes an `eval-02` that tests an edge case, not just the happy path.
- [ ] The generated `trigger` field includes exactly 2–3 sentences.
- [ ] The response notes which models have been tested vs assumed.

---

## Automatic disqualification

- `SKILL.md` instructions are written about Claude ("Claude will X") rather than to Claude ("Do X").
- `trigger` has no boundary condition.
- `## What to avoid` has fewer than 3 items.
- The generated `output.md` is truncated with "...and so on" or "etc."
