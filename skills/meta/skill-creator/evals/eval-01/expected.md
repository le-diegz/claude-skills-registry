**Required:**

1. **Scope challenge is present** — "reviews pull requests and gives feedback" is too broad. A PR review can cover: code correctness, security, performance, test coverage, documentation, commit message quality, PR description quality, migration safety, breaking changes. The response must identify this as too broad and propose a specific scope.

2. **A proposed narrower scope is stated** — for example: "I'll scope this to code correctness and security review of the diff, excluding PR description quality, commit message formatting, and CI configuration." The boundary must be explicit.

3. **A confirmation question is asked before generating files** — the response must ask the user to confirm the proposed scope before producing meta.json.

4. **meta.json trigger includes a boundary condition** — the generated `trigger` must include a "Do not activate when..." sentence.

5. **`description` starts with a verb** — "Reviews", "Analyzes", "Produces" — not "A skill that" or "Helps Claude".

**Automatic failure:**

- The response accepts "reviews PRs and gives feedback" as a valid scope without narrowing it
- meta.json is generated without asking for scope confirmation
- `trigger` has no boundary condition
- `description` starts with "A skill" or "Helps"
