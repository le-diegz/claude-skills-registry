---
name: data-analyst
description: Produces data insights by clarifying context first, recommending chart types, and separating correlation from causation.
---

## When to use this skill

Use this skill when:
- The user shares a dataset, CSV, table, set of metrics, or query results and asks for analysis, insights, trends, or patterns.
- The user asks "what does this data show", "what are the key takeaways", "what visualization would work here", or "what should I focus on".
- The user has run an experiment (A/B test, cohort analysis) and wants to interpret the results.

Do not use this skill when:
- The user only wants to transform or clean data without an analytical question (use a data transformation approach instead).
- The user wants SQL generated with no analysis required.
- The user asks to build a dashboard or visualization UI (that is a frontend task).

---

## Instructions

### Step 1 — Ask before analyzing

Before producing a single insight, ask the questions that determine whether the analysis will be useful. Do not skip this step even if the data looks self-explanatory.

**Always ask:**
1. What decision does this analysis need to support? (The same dataset analyzed to "understand churn" vs "decide whether to run a retention campaign" produces different outputs.)
2. What is the time period and sample — and is the data a full population or a sample?
3. Are there known data quality issues (missing values, duplicates, collection gaps)?

**Ask only if not obvious from the data:**
- What does each column represent?
- What is the unit of one row?
- Is there a baseline or benchmark to compare against?

Ask these as a single grouped message. Do not ask them one at a time across multiple messages.

If the user says "just analyze it", proceed — but open your analysis with an explicit assumptions section that states what you assumed about each of these questions.

### Step 2 — Orient before diving in

Before findings, give one paragraph that orients the reader:

- How many rows and columns
- The time range (if there is a date column)
- Any immediately obvious data quality flags (nulls above 5%, duplicate IDs, dates out of order)

This is not the analysis. This is the reader's baseline for evaluating the analysis.

### Step 3 — Choose visualization type from the data shape, not from preference

Select chart types using these rules. Do not default to bar charts and line charts for everything.

| Question being answered | Data shape | Chart type |
|---|---|---|
| How does X change over time? | One metric, date column | Line chart |
| How does X compare across categories? | One metric, category column, < 8 categories | Bar chart (horizontal if labels are long) |
| How does X compare across many categories? | One metric, category column, > 8 categories | Sorted horizontal bar or dot plot |
| What is the distribution of X? | One continuous metric | Histogram or box plot |
| Is there a relationship between X and Y? | Two continuous metrics | Scatter plot |
| What is the composition of a whole? | Parts of a total, < 5 categories | Stacked bar (not pie chart) |
| How does a metric vary across two dimensions? | Two category columns + one metric | Heatmap |
| What are the outliers? | One metric, ranked entities | Dot plot with labeled extremes |

**Never recommend a pie chart for more than 4 categories.** The human eye cannot reliably compare slice sizes beyond 4.

When you recommend a visualization, include:
- The chart type
- What goes on each axis
- What color encoding represents
- One sentence on what the reader should look for

### Step 4 — State findings as findings, not as certainties

Every insight must include:

1. **The observation**: what the data shows (a number, a trend, a comparison)
2. **The magnitude**: how large the effect is, not just its direction
3. **The confidence**: whether this is definitive, tentative, or "warrants investigation"

**Bad insight (do not write this):**
> Users who use Feature X retain better. You should invest in Feature X.

**Good insight (write this instead):**
> Users who activated Feature X in their first week had a 30-day retention rate of 58% vs 31% for those who didn't (n=4,200 vs n=12,800). The difference is large enough to be meaningful, but this is correlation — users who activate a feature in their first week are likely already more engaged. Before investing in Feature X, run a controlled experiment to separate the feature's effect from pre-existing engagement intent.

The critical distinction:
- **Correlation**: two things move together in the data
- **Causation**: one thing causes the other

Never state causation from observational data. Always use language like "associated with", "correlated with", "users who X also tend to Y". Reserve causal language for randomized experiments.

### Step 5 — Prioritize insights by decision value

Produce at most 5 insights. Order them by how directly they support the decision stated in Step 1. An interesting pattern that does not affect any decision is a footnote, not a finding.

Structure findings as:

```
## Key findings

1. [Most decision-relevant finding] — [one-sentence observation with magnitude]
2. [Second finding]
...

## What this suggests (if you have enough data to suggest it)

[One paragraph connecting findings to the decision, with explicit caveats]

## What this does not tell us

[One to three things the data cannot answer, and what additional data would]
```

---

## Examples

**Input:**
```
Here's signup data for the last 90 days. Can you tell me what's going on?

date,signups,source,country,converted_to_paid
2026-01-01,142,organic,US,18
2026-01-01,89,paid,US,31
2026-01-01,44,organic,UK,4
...
```

**Output:**

Before I analyze, a few quick questions to make sure the output is useful:

1. What decision does this need to inform — are you trying to optimize acquisition spend, understand conversion by country, or something else?
2. Is this all signups, or a sample? The row counts will affect how much weight I give to small segments.
3. Is there a target conversion rate you're benchmarking against, or should I derive a baseline from the data itself?

If you'd prefer I just proceed, I'll assume the goal is understanding acquisition efficiency, that this is the full population, and that the baseline is the average across the dataset.

---

**Input (follow-up, user says "just go ahead"):**

**Output:**

**Assumptions:** Goal = acquisition efficiency. Full population. Baseline = dataset average.

**Dataset overview:** 90 days, 4 columns, no nulls detected. Date range: Jan 1 – Mar 31, 2026. Rows represent daily signup counts by source + country combinations.

---

## Key findings

1. **Paid signups convert at 2.1× the rate of organic** — paid: 34.8% conversion, organic: 16.2% (across all countries). This is the largest signal in the data.

2. **UK organic conversion is an outlier at 9.1%** — roughly half the overall organic average. This may reflect audience fit, landing page localization, or a tracking issue. Requires investigation before drawing conclusions.

3. **Organic volume grew 22% over the period while paid was flat** — paid daily signups held steady at ~90/day; organic grew from ~120 to ~147/day. If the conversion rate holds, organic is becoming more valuable in absolute terms.

## What this suggests

Paid acquisition produces higher-value signups, but organic is growing and approaching paid in absolute converted users. The UK anomaly is large enough to be worth a separate investigation — it could represent a pricing issue, a localization gap, or a data quality problem.

## What this does not tell us

- Whether paid converts better because of the channel or because of who the paid campaigns target (causation vs selection)
- Whether "converted_to_paid" means within the same session or eventually — the time window matters significantly for LTV calculations
- CAC for paid, which is required to compare the economics of the two channels

---

## What to avoid

- Do not skip the clarifying questions. Analyzing data without knowing the decision it serves often produces accurate but useless output.
- Do not state causation from observational data. "Feature X causes retention" from a non-experimental dataset is always wrong. Use "associated with", "correlated with", or "users who X also tend to Y".
- Do not default to bar charts and line charts for every dataset. Choose the chart type from the data shape, not from habit.
- Do not produce more than 5 key findings. Longer finding lists dilute the signal. If you have 10 things to say, rank them and cut the bottom 5.
- Do not omit magnitude. "Conversion is higher for paid" is not a finding. "Paid converts at 2.1× organic" is a finding.
- Do not omit the "What this does not tell us" section. Every dataset has gaps. Making them explicit is more useful than omitting them.
- Do not round numbers in a way that obscures the scale. 34.8% and 35% are not the same thing when the dataset is 100k rows.
