Good candidate for a skill. Commit message generation is specific (one output type), testable (we can verify Conventional Commits format), and repeatable. Let me confirm scope before generating files.

The format you described — Conventional Commits, 72-char subject, optional body — is well-defined. One question: should the skill infer the type (`feat`, `fix`, `chore`, etc.) from the diff content, or should it ask the user to specify? I'll default to inferring from the diff, with a note to the user when inference is uncertain.

Scope boundary: this skill generates commit messages from diffs. It will not generate changelogs, release notes, or branch names (those are separate skills with different output formats).

---

**`meta.json`:**

```json
{
  "name": "commit-message-writer",
  "version": "1.0.0",
  "description": "Generates a Conventional Commits-formatted message from a git diff, with an optional body for non-trivial changes.",
  "trigger": "Activate this skill when the user shares a git diff, a list of changed files, or a description of staged changes and asks for a commit message. Do not activate for changelog generation, release notes, branch naming, or PR title writing.",
  "domain": "code",
  "tags": ["git", "commit", "conventional-commits", "version-control"],
  "author": "your-handle",
  "model_compatibility": ["claude-sonnet-4-6", "claude-opus-4-6"],
  "requires_tools": [],
  "license": "MIT"
}
```

---

**`SKILL.md` — key sections:**

**Instructions (numbered steps):**

1. Read the entire diff before deciding on a type. A change that adds a new function to an existing file could be `feat` or `refactor` — the type depends on whether it adds user-visible capability.

2. Assign the Conventional Commits type using these rules:
   - `feat` — adds a user-visible capability
   - `fix` — corrects a bug in existing behavior
   - `refactor` — restructures code without changing external behavior
   - `chore` — build, CI, dependencies, non-code
   - `docs` — documentation only
   - `test` — tests only
   - `perf` — measurable performance improvement
   If uncertain between two types, choose the one that describes the *primary* effect and note the ambiguity in the body.

3. Write the subject line: `<type>(<optional scope>): <imperative-mood description>`
   - Under 72 characters
   - Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removed"
   - No period at the end
   - Scope is optional: use it when the change is clearly isolated to one module or area

4. Add a body if and only if:
   - The change is non-trivial and the subject alone doesn't explain the *why*
   - There are multiple distinct changes in the diff
   - A breaking change needs to be documented
   Separate body from subject with a blank line. Wrap at 72 characters.

5. Add `BREAKING CHANGE: <description>` as a footer if the diff removes or changes a public API, config key, or behavior that callers depend on.

**What to avoid:**

- Do not write "Update X" as a subject — this conveys no information. State what changed about X.
- Do not use past tense ("Added feature X") — Conventional Commits uses imperative ("add feature X").
- Do not write a body for trivial changes. A one-line variable rename does not need a body paragraph.
- Do not add a scope that is the same as the type ("fix(fix):").
- Do not invent a `misc` or `update` type — if you can't determine the type, default to `chore` and note the uncertainty.

---

**Suggested `evals/eval-02/input.md`** (edge case — ambiguous type):
```
diff shows: a function renamed from `getUserData` to `fetchUser`, return type unchanged,
logic unchanged. No other changes.
```

**Expected:** The skill produces `refactor: rename getUserData to fetchUser` (not `feat`, not `fix`) and does not add a body (pure rename, no behavioral change to explain).

---

Want me to write all files to disk? I'll generate the complete `SKILL.md`, two example pairs, and `evals/rubric.md` with verifiable criteria.
