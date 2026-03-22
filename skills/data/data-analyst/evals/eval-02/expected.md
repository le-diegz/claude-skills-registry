Edge case: the user has already stated a causal conclusion ("the features must not be resonating") from observational data. The expected behavior is to gently challenge the assumption AND provide useful visualization recommendations.

**Required:**

1. **The response challenges the causal assumption** — flat DAU with new features has multiple explanations: features aren't used, features are used but don't drive DAU, DAU metric is masking growth in one segment offset by churn in another, seasonal effect, or external factor. The response must name at least two alternative explanations before proceeding.

2. **Visualization recommendations are specific** — at least 3 chart type recommendations, each with:
   - What data is needed
   - What chart type
   - What question it answers

   Example of minimum acceptable recommendation:
   > "Feature adoption funnel: for each of the 3 features, a funnel chart showing % of DAU who viewed the feature entry point → triggered the feature → completed the feature action. This distinguishes 'users didn't find the feature' from 'users found it and didn't use it'."

3. **No causal language in the response** — the response must not confirm "the features are not resonating" — that is the hypothesis, not the finding.

**Recommended:**

- The response suggests what additional data would be needed beyond what the user described (feature usage events, cohort DAU by signup date, etc.)

**Automatic failure:**

- The response confirms "yes, the features are not resonating" without evidence
- Visualization recommendations lack chart types or axis descriptions
- The response does not challenge the user's causal assumption
