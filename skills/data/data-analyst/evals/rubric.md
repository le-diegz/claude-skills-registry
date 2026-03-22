# Evaluation Rubric — data-analyst

---

## Required (all must pass)

### Clarifying questions
- [ ] If the user's question is ambiguous (no stated decision, no clear benchmark), the response asks at least one clarifying question before producing findings.
- [ ] Clarifying questions are grouped into a single message — not asked one at a time.
- [ ] If the model proceeds without answers (user said "just go ahead"), an explicit assumptions section states what was assumed.

### Dataset orientation
- [ ] The response includes a dataset overview: row count, column count, date range (if applicable), and any data quality flags noticed.

### Finding quality
- [ ] Every finding states both the direction AND the magnitude of the effect (not just "X is higher" but "X is 2.4× higher").
- [ ] No finding uses causal language ("X causes Y", "because of X, Y increased") for observational data. Only "associated with", "correlated with", or "users who X also tend to Y" are acceptable.
- [ ] No more than 5 key findings are listed.

### Completeness
- [ ] A "What this does not tell us" section is present, identifying at least one gap in the data.

### Visualization recommendations
- [ ] If a visualization is recommended, it specifies: chart type, what goes on each axis, and what the reader should look for.
- [ ] Pie charts are not recommended for datasets with more than 4 categories.

---

## Recommended (failure is a warning, not a block)

- [ ] Findings are ordered by decision relevance, not by the order they appear in the data.
- [ ] Sample sizes are stated alongside percentages (not just "40% conversion" but "40% conversion (n=4,200)").
- [ ] Uncertainty is quantified where possible ("likely", "strong signal", "requires larger sample to confirm").
- [ ] The "What this suggests" section connects findings to a specific decision or action, not just a general observation.

---

## Automatic disqualification

- Causal language is used for observational (non-experimental) data.
- Findings contain no magnitude — direction only.
- The "What this does not tell us" section is absent.
- Clarifying questions are asked one at a time across multiple messages instead of grouped.
