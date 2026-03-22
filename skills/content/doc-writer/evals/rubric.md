# Evaluation Rubric — doc-writer

---

## Required (all must pass)

### Structure
- [ ] The documentation moves from general to specific: concept/overview before usage, usage before reference.
- [ ] A Quick Start section is present and contains runnable code (not pseudocode, not `// your logic here`).
- [ ] Every section except the title heading contains at least one code example or concrete illustration.

### Writing quality
- [ ] No section opens with "In this section, we will..." or any equivalent filler opener.
- [ ] No occurrence of "simply", "just", "easily", or "straightforward" anywhere in the output.
- [ ] Instructions use active voice and imperative form: "Install the package" not "The package should be installed".
- [ ] A term is not used before it is defined. Technical terms introduced without definition are a failure.

### Code examples
- [ ] Every code block has a language identifier on the fence (` ```js `, ` ```bash `, ` ```http `, etc.).
- [ ] Code examples are complete and syntactically valid for the stated language.
- [ ] No placeholder values appear inside code examples without a comment explaining what to replace them with (e.g. `<your-api-key>` must be labeled).

### Accuracy
- [ ] No behavior is documented that was not present in the user's input specification.
- [ ] No behavior is omitted that the user's input explicitly described.

---

## Recommended (failure is a warning, not a block)

- [ ] A table is used when comparing 3 or more options, parameters, or properties.
- [ ] A "When to use it / When not to use it" section is present for libraries and tools.
- [ ] A Troubleshooting section is included for tools that have non-obvious failure modes.
- [ ] Heading levels are sequential — no `###` directly under `#` (skipping `##`).

---

## Automatic disqualification

- The Quick Start section is absent.
- A code block is present without a language identifier.
- The word "simply" or "just" appears in the context of downplaying user effort.
- Documented behavior contradicts the user's provided specification.
