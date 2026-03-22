Before I analyze, a couple of quick questions to make sure this is useful:

1. What decision does this analysis need to support — are you evaluating whether the campaign was worth it, deciding whether to run another one, or something else?
2. Is the `source` column describing where users came from (acquisition channel) or the cause of WAU change in that week? Some weeks have mixed sources in your data.

I'll proceed with two assumptions: (1) goal is evaluating campaign effectiveness, and (2) `source` marks the dominant driver of that week's change.

---

**Dataset overview:** 24 weekly rows, Oct 2025 – Mar 2026. WAU + user flow data (new and churned). No nulls. Three source phases: organic (pre-campaign), campaign (Feb), post-campaign (Mar).

---

## Key findings

1. **The campaign drove a strong short-term WAU lift of +36%, but retention is eroding rapidly**
   WAU peaked at 15,100 during the campaign (week of Feb 23). As of March 16, WAU has fallen to 13,600 — a loss of 1,500 users in 3 weeks. The weekly churn rate in post-campaign weeks (980–1,180 churned/week) is running at 2–3× the pre-campaign baseline (240–310/week).

2. **Pre-campaign, the product was losing users steadily for 3 months before the campaign**
   WAU declined from 13,100 in early November to 11,000 by late January — a 16% decline over 12 weeks. The campaign masked this underlying trend. If the campaign-acquired users churn at the same rate they currently are, WAU will return to the January baseline (~11,000) within 6–8 weeks.

3. **New user acquisition collapsed immediately after the campaign ended**
   Campaign weeks averaged 1,800 new users/week. Post-campaign weeks dropped to 590–780/week — below the Oct–Nov organic baseline of ~800/week. This suggests the organic acquisition engine was not improving during the campaign period.

4. **Campaign users are churning at a significantly higher rate than organic users**
   In the 3 post-campaign weeks, 3,260 users churned total. If organic churn had held at the Oct baseline (~270/week), that would account for only ~810 of those churns. The remaining ~2,450 churns are attributable to campaign-acquired users who did not retain — a 65%+ non-retention rate for campaign cohort within 3 weeks.

## What this suggests

The campaign successfully acquired users, but those users are not staying. Combined with a pre-existing organic decline, the product appears to have a retention problem that acquisition spend amplifies but does not solve. Running another campaign without addressing the underlying churn driver is likely to produce the same pattern: a temporary lift followed by faster-than-baseline decay.

Before deciding on the next campaign, the higher-value question is: what are campaign-acquired users doing (or not doing) in their first two weeks that organic users who retained did not?

## What this does not tell us

- **Causation for churn** — the data shows when users churned but not why. Behavioral data (feature usage, session frequency in first 7 days) is needed to identify the failure point.
- **Revenue impact** — WAU is a volume metric. Whether the campaign was economically worth it depends on CAC and the LTV of retained vs churned users, which isn't in this dataset.
- **Statistical significance of the pre-campaign decline** — the organic decline from Nov–Jan could partially reflect seasonality. A year-over-year comparison would clarify this.
