---
title: 'The Shipyard — Part 2'
description: 'Building a CI/CD pipeline for machine learning: how we eliminated deployment toil and automated adherence'
pubDate: '2022-01-16'
heroImage: '/blog-images/shipyard-part2-pipeline.svg'
tags: ['mlops', 'ci-cd-pipeline', 'mlops-platform', 'automation']
---

*Originally published on the [Interos Engineering blog](https://medium.com/interos-engineering/the-shipyard-part-2-2689ca9dc9bb).*

---

In [Part 1](https://medium.com/interos-engineering/the-shipyard-part-1-b12d381624f0), we introduced The Shipyard and the three-layer architecture behind it. In this post, we get into the mechanics: how do models actually move from a data scientist's notebook to production?

The short answer is: through a lot of automation, and a tool we built called **Snitch**.

## The Problem With Manual Deployments

When we started, the deployment process for a new model looked something like this:

1. Data scientist trains a model and thinks it's good enough for production
2. Data scientist opens a Slack message to the platform team
3. Platform engineer manually reviews the model artifacts
4. If it looks okay, they manually push the model through staging and into production

This doesn't scale, and it creates the wrong incentives. The platform team becomes a bottleneck. Data scientists learn to minimize their asks to avoid the friction. Important review steps get skipped when everyone is moving fast.

We needed a system that automated the rote parts while *enforcing* the important parts — not just documenting them.

## The CI/CD Pipeline

We built a pipeline that takes a model artifact all the way from code commit to production. Here's how it's structured:

![ML CI/CD Pipeline — from code commit through automated testing, container build, staging, and production deployment](/blog-images/shipyard-part2-pipeline.svg)

### Stage 1: Code Commit

A data scientist commits a model — not just the weights file, but also:

- Training code (reproducible)
- Configuration (hyperparameters, data version, feature list)
- Evaluation results (metrics on a held-out test set)
- A changelog entry

This is submitted as a pull request to a dedicated model repository. More on why we use Git as our model registry in a moment.

### Stage 2: Automated Tests

The PR triggers a battery of automated checks:

- **Code quality**: linting, type checking, import validation
- **Data validation**: schema checks against the expected input format
- **Model evaluation**: reproducing the evaluation run against our standard benchmark dataset to validate the reported metrics
- **Dependency scanning**: ensuring the model doesn't introduce new library versions that conflict with our serving infrastructure

Tests run in a containerized environment on our Kubernetes cluster. A PR cannot be merged unless all tests pass.

### Stage 3: Container Build

Once tests pass and the PR is reviewed (by a human), the model artifacts are packaged into a Docker image. The image is tagged with an immutable version identifier — a combination of the git commit SHA and a timestamp — and pushed to our ECR registry.

This immutability is critical. Once an image is built, it never changes. If we discover a bug in a deployed model, we roll back to the previous image, which we know is identical to what was running before.

### Stage 4: Staging

The new model image is deployed to a staging environment that mirrors production. We run it in shadow mode — the model receives real traffic but its outputs don't affect customers. This lets us catch latency issues, memory problems, and unexpected output distributions before they impact anyone.

Staging runs for a minimum of 24 hours. Snitch (more below) monitors the shadow outputs continuously during this period.

### Stage 5: Production

After staging validation, a human reviewer approves the promotion. We do a canary deployment — 5% of traffic initially, then 25%, then full rollout over a period of hours — with automated rollback triggers if error rates or latency spike.

## Git as the Model Registry

We use Git as our model registry. This is an unconventional choice — most teams reach for MLflow or a purpose-built model registry — but it's worked extremely well for us.

Why Git?

- **We already understand it**: Every engineer on our team knows how to use Git. A purpose-built model registry would require everyone to learn a new tool.
- **PR-based review is natural**: The pull request workflow maps perfectly onto the review and approval process we want for model promotion. Comments, approvals, change requests — all the collaboration primitives are already there.
- **Immutable history**: Git's content-addressed storage means we can always reconstruct exactly what was deployed at any point in time.
- **Branch = environment**: `main` maps to production, `staging` maps to staging, and feature branches are where development happens. Promotion is just a merge.

The downside is that model artifacts can be large. We use Git LFS for the weight files and store only the metadata (metrics, config, changelog) directly in the repository. The actual weights live in S3, referenced by SHA.

## Snitch: Automating Adherence

The most important thing we built wasn't the pipeline itself — it was Snitch.

Snitch is a tool that watches every stage of the pipeline and enforces our standards. It's named for what it does: it tells on models that don't follow the rules.

What does Snitch check?

- **Metadata completeness**: Is the model's changelog entry complete? Are all required fields populated?
- **Evaluation coverage**: Were the evaluation metrics computed against the current benchmark dataset, or an outdated version?
- **Performance regression**: Does the new model perform at least as well as the currently deployed model on the standard benchmark?
- **Data freshness**: Was the model trained on data from within the last N days?
- **Dependency audit**: Does the model use any deprecated or disallowed libraries?

If any check fails, Snitch blocks the PR from merging and posts a detailed failure report as a PR comment. This makes the standard explicit and visible rather than implicit and tribal.

Over time, we've found that Snitch is the most valuable artifact we built. It's the thing that makes the platform trustworthy — data scientists know that if a model makes it through Snitch, it's safe to deploy.

## What This Unlocked

Before this system, promoting a model to production took 1-2 weeks (mostly waiting for someone to have bandwidth to review it manually). After, the median time is 2 days — one day for automated testing and staging validation, one day for human review.

More importantly, the platform team's role changed. We went from being a bottleneck in every deployment to being the people who maintain the pipeline and standards. Data scientists could move faster because the system was doing the enforcement work.

---

*[Continue to Part 3 →](https://medium.com/interos-engineering) — the model promotion pipeline in depth, and how we built confidence that promoted models are actually better.*
