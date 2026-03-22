## Type of change

<!-- Check all that apply. -->

- [ ] New skill
- [ ] Improvement to an existing skill (instructions, examples, evals)
- [ ] Bug fix (incorrect output, broken validation, schema error)
- [ ] Meta (CI, scripts, docs, spec — no skill content changed)

---

## Description

<!-- What does this PR do and why? Keep it to 2–4 sentences.
     For new skills, explain what problem the skill solves and for whom.
     For improvements, explain what was wrong and what you changed. -->

---

## Skills added or modified

<!-- List each skill path changed in this PR. -->

- `skills/<domain>/<skill-name>`

---

## Validation checklist

<!-- Every box must be checked before requesting a review.
     PRs with unchecked required items will not be merged. -->

### Required

- [ ] I have read [`docs/skill-spec.md`](../docs/skill-spec.md) in full.
- [ ] `meta.json` is present and all fields are filled in correctly (name, version, description, trigger, domain, tags, author, model_compatibility, requires_tools, license).
- [ ] The skill directory name matches `meta.json → name` exactly.
- [ ] `SKILL.md` is present with valid frontmatter (`name` and `description` matching `meta.json`) and all four required sections.
- [ ] `examples/` is present and contains at least one `example-01/` subdirectory with `input.md` and `output.md`.
- [ ] I ran `node scripts/validate-skill.js <path>` locally and the output is `✓ skill valid: <name>`.
- [ ] `index.json` has been updated (run `node scripts/build-index.js` locally).

### Required for new skills

- [ ] `evals/` is present with `rubric.md` and at least two `eval-NN/` subdirectories.
- [ ] I tested the skill against all models listed in `model_compatibility`.
- [ ] The skill name is unique — I checked the registry and no existing skill uses this name.

### Recommended

- [ ] Examples cover at least two distinct input scenarios.
- [ ] At least one eval tests an edge case or failure boundary.
- [ ] The PR title follows the format: `feat(domain): add <skill-name>` for new skills, or `fix(domain): <skill-name> — <short description>` for updates.
