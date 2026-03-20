---
title: 'The Shipyard — Part 3'
description: 'The model promotion pipeline: how we built confidence that models promoted to production are actually better'
pubDate: '2022-01-30'
heroImage: '/blog-images/shipyard-part3-promotion.svg'
tags: ['mlops', 'mlops-platform', 'model-promotion', 'machine-learning']
---

*Originally published on the [Interos Engineering blog](https://medium.com/interos-engineering).*

---

In [Part 2](https://medium.com/interos-engineering/the-shipyard-part-2-2689ca9dc9bb), we walked through the CI/CD pipeline: how a model artifact moves from code commit through automated tests, container build, and staging. In this final part of the series, we focus on the hardest part: the promotion decision itself.

Getting a model into staging is the easy part. Deciding it's ready for production is hard.

## The Core Problem With Model Promotion

Software deployments are relatively easy to reason about: the new version either works correctly or it doesn't. You can write tests. You can check error rates. Pass/fail.

Model promotions are different. A model can be technically correct — it produces valid outputs, it doesn't crash — while still being *worse* than what it's replacing. The model you trained last month might score 78% on your benchmark dataset. The new model scores 81%. But is 81% on a static benchmark actually better in production?

Not necessarily. Here's why this is hard:

- **Distribution shift**: The benchmark dataset was sampled months ago. The production data distribution may have shifted significantly since then.
- **Coverage gaps**: The benchmark may not cover important edge cases. Your model might be better on average but worse on the specific segments that matter most.
- **Metric gaming**: Over time, models trained on the same benchmark can overfit to it. The benchmark stops being a proxy for real-world performance.

We built a promotion process that accounts for these realities.

## The Model Promotion Pipeline

![Model Promotion Pipeline — Dev, Staging, and Production environments with automated and human gates](/blog-images/shipyard-part3-promotion.svg)

### Step 1: Candidate Registration

When a data scientist believes their model is ready for promotion consideration, they submit it to our Git model registry (see Part 2 for details on how that works). The submission includes:

```
model/
  weights/          # Model artifact (Git LFS)
  config.yaml       # Hyperparameters and training configuration
  eval_results.json # Metrics on standard benchmark
  CHANGELOG.md      # What changed and why
  data_manifest.txt # Training data snapshot identifiers
```

This structured format is enforced by our pre-commit hooks and validated by Snitch as the first gate.

### Step 2: Automated Evaluation

Once a candidate is registered, our evaluation pipeline runs automatically. This isn't just re-running the data scientist's evaluation — it's a *reproducible* evaluation on a controlled benchmark dataset that we maintain independently.

The distinction matters. If the data scientist ran their evaluation on data they had access to during training, that evaluation is potentially optimistic. Our pipeline runs on a held-out benchmark that no model ever trains on directly.

We compute a suite of metrics:

- **Overall performance**: The standard top-line metric (usually AUC or F1, depending on the use case)
- **Segmented performance**: Performance on key subgroups — entity types, industry sectors, geographic regions
- **Calibration**: Are the model's confidence scores actually calibrated? A model that says "70% probability" should be right about 70% of the time.
- **Latency**: 50th, 95th, and 99th percentile inference times under representative load

Results are posted back to the PR as a formatted report.

### Step 3: Shadow Evaluation in Staging

The automated evaluation against our benchmark is necessary but not sufficient. The benchmark is a snapshot; production is a live stream.

We deploy every candidate model to staging in shadow mode — the model receives real production traffic but its outputs are discarded. We collect:

- Input distribution statistics (to detect distribution shift from training data)
- Output distribution statistics (to detect unexpected prediction behavior)
- Latency under real load (benchmarks don't always predict this accurately)

The shadow evaluation runs for a minimum of 24 hours, or longer for models handling rare event types where we need more samples. Snitch monitors the shadow outputs and flags anomalies.

### Step 4: The Human Gate

After automated evaluation and shadow staging, a human reviewer — someone who understands both the model and the business context — reviews the results and makes the promotion decision.

This might seem like we're back where we started (manual review), but there's a critical difference: the reviewer now has access to a standardized, reproducible evaluation report rather than whatever the data scientist happened to run. The decision is informed by consistent metrics.

The reviewer is specifically looking for:

1. **Regression on important segments**: Even if overall metrics improved, did any critical subgroup get worse?
2. **Calibration changes**: Did the confidence distribution shift in a way that would break downstream systems that threshold on probability?
3. **Business context**: Is there anything happening in the world right now that makes this the wrong time to swap models? (e.g., a major geopolitical event that the training data doesn't cover well)

### Step 5: Canary Deployment

Approved models deploy to production via a canary process: 5% of traffic initially, then 25%, then 100%, with a minimum hold period at each stage.

At each stage, we monitor:

- Error rate (compared to baseline)
- Prediction latency (p50, p95, p99)
- Output distribution (are predictions drifting from what we saw in shadow mode?)
- Downstream business metrics (where available and relevant)

Automated rollback triggers fire if any metric exceeds our configured thresholds. This provides a safety net that doesn't rely on someone watching dashboards.

## Lessons Learned

After running this process for a year, here's what we've found works and what we'd do differently.

**What worked:**

The structured evaluation report in PRs was transformative. When the reviewer has a clear, standardized summary of "this model scores X% overall, with the following segment-level changes from the current production model," the decision is much easier to make consistently.

The shadow evaluation saved us multiple times. Models that looked great on benchmarks turned out to have subtle problems — unexpected output distributions, edge cases that only appeared in production traffic — that the shadow mode caught before they affected customers.

**What we'd do differently:**

We were too conservative about automation in the early days. We required a human to manually approve every single promotion, including models that were clearly improvements on all metrics. This created bottlenecks and slowed down the team.

We've since added an **automatic promotion path** for model updates that show improvement on all tracked metrics and pass all automated checks with a margin. A human still reviews the promotion report, but they don't need to take an action — the system promotes automatically after a 24-hour review window unless someone explicitly blocks it.

The other thing we underinvested in early was monitoring *after* promotion. Our pre-promotion process is rigorous, but production models can degrade for reasons we didn't anticipate. We've since invested significantly in post-deployment monitoring: data drift detection, prediction distribution monitoring, and correlation with business metrics.

## Wrapping Up

The Shipyard took about a year to build to the state described in this series. It's not done — there's always more to do — but it's at a point where it genuinely accelerates the team rather than holding it back.

The most important thing I'd tell someone starting a similar project: the platform is not the point. The point is getting better models into production faster and with more confidence. Build the minimum platform that achieves that, validate it with real workflows, and iterate from there.

The fancy architecture diagrams are satisfying to draw. But the measure of success is whether your data scientists ship faster and your customers get better predictions. Start there.

---

*← [Back to Part 1](https://medium.com/interos-engineering/the-shipyard-part-1-b12d381624f0) | [Part 2](https://medium.com/interos-engineering/the-shipyard-part-2-2689ca9dc9bb)*
