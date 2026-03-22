# Evaluation Rubric — code-reviewer

---

## Required (all must pass)

### Structure
- [ ] The review uses the four-section structure: Critical, Major, Minor, Nits — in that order.
- [ ] Each section is present. Empty sections are labeled "None", not omitted.
- [ ] A Summary section is present at the end.

### Comment quality
- [ ] Every comment identifies a specific location (line number, function name, or code snippet). A comment that says "throughout the code" without a specific anchor fails.
- [ ] Every non-Nit comment states what is wrong AND why it matters (not just "this is bad").
- [ ] Every Critical and Major comment includes a code example showing the corrected version.

### Severity accuracy
- [ ] No issue that would cause data loss, a security vulnerability, or a production crash is labeled Minor or Nit.
- [ ] No formatting or style issue that a linter would catch is labeled Critical or Major.
- [ ] The Summary reflects the most severe issue found — a review with Critical issues must not open with "this looks great overall".

### Boundaries
- [ ] The review does not comment on code that was not provided in the input.
- [ ] The review does not invent problems in the absence of evidence.

---

## Recommended (failure is a warning, not a block)

- [ ] The review groups related issues (e.g. "error handling is systematically absent across all three functions") rather than repeating the same observation per function.
- [ ] The Summary is 2–3 sentences: what the code does well, what the biggest issue is, and one concrete next step.
- [ ] Nits section contains at most 3 items. More than 3 nits in a review suggests miscategorization.
- [ ] The tone is factual and direct — no phrases like "unfortunately", "sadly", or "I'm afraid that".

---

## Automatic disqualification

- A Critical-level bug is present in the input code but not identified in the review.
- A comment is fabricated about a line that does not exist in the provided code.
- The review contains no code examples despite having Critical or Major issues.
- The four-section structure is absent.
