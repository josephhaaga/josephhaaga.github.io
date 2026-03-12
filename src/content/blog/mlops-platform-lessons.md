---
title: 'Lessons Learned Building an MLOps Platform from Scratch'
description: 'Key insights from architecting and scaling ML infrastructure for production workloads'
pubDate: '2024-01-15'
tags: ['mlops', 'kubernetes', 'kubeflow', 'infrastructure']
---

Building an MLOps platform from scratch is one of the most rewarding — and humbling — engineering challenges I've faced. Over the past few years, I've gone through this process multiple times, and each time I've learned something new. Here are the hard-won lessons I wish someone had told me at the start.

## Start With the Pain, Not the Platform

The biggest mistake MLOps teams make is building a platform before they understand the actual pain points. Before you install Kubeflow, before you spin up MLflow, ask your data science team a simple question: *What takes the most time right now?*

Sometimes the answer is environment reproducibility. Sometimes it's experiment tracking. Sometimes it's just getting a model into a Docker container. The answer will tell you where to start.

At one company, I spent three months building a sophisticated feature store before realizing the data science team's actual bottleneck was getting GPU access for training. The feature store was technically impressive and completely irrelevant to their daily work.

## Kubernetes Is Non-Negotiable (But Learn It First)

Modern MLOps runs on Kubernetes. Kubeflow, Argo Workflows, Seldon, KServe — almost everything in the ecosystem assumes a k8s cluster. If your team doesn't have strong Kubernetes skills, that's the first gap to close.

But be careful: Kubernetes has a steep learning curve, and adding ML workloads (GPU node pools, custom schedulers, large ephemeral storage needs) makes it steeper. Make sure someone on the team genuinely understands:

- Resource requests and limits (especially GPU)
- Node affinity and taints/tolerations
- Persistent volume claims and storage classes
- Namespace isolation and RBAC

I've seen MLOps platforms fall apart because the data science team could use Kubeflow pipelines but couldn't debug why their pods were stuck in `Pending` — because nobody understood the node pool configuration.

## The Pipeline Is Not the Product

It's tempting to measure success by the number of pipelines you've built. Don't. The product is a model in production serving predictions. Everything else is infrastructure.

This reframing changes what you optimize for. Instead of building elaborate pipeline DAGs with 15 steps, ask: *Can a data scientist go from a Jupyter notebook to a deployed model in under a day?* If the answer is no, simplify.

At BuzzFeed, we went through three pipeline frameworks before settling on the simplest one that met our actual requirements. Fewer steps, fewer moving parts, fewer things that could break at 3am.

## Observability Is a First-Class Requirement

Model observability is different from service observability, but you need both. For the service layer:

- Request latency and error rates
- Throughput and concurrency
- Pod restarts and OOM events

For the model layer:

- Prediction distribution drift
- Feature drift
- Business metric correlation

The second category is harder and often gets skipped. Don't skip it. A model that's technically healthy (fast responses, no errors) but has silently degraded in quality is worse than a model that's throwing errors — at least errors are visible.

## Standardize the Contract, Not the Implementation

One of the best decisions we made was defining a standard interface for models: what inputs they accept, what outputs they return, how they're packaged. We didn't dictate that every team had to use TensorFlow or PyTorch or scikit-learn. We just said: here's the container interface, here's the metadata spec, and here's how to register a model.

This gave data scientists freedom while giving the platform team predictability. New frameworks (Hugging Face, XGBoost, custom PyTorch) could plug in without touching the serving infrastructure.

## Automation Reduces Toil, Not Judgment

There's a temptation to automate everything, including promotion decisions. Resist it. You can automate the *test* (does model A outperform model B on the holdout set?), but the *decision* to promote a model to production should involve a human who understands the business context.

What we automated:
- Running evaluations on every model artifact
- Publishing evaluation reports to Slack
- Opening a PR with the new model version

What a human still decided:
- Is this good enough to deploy?
- Are there edge cases the metrics aren't capturing?
- Is now the right time to roll this out?

## Summary

Building MLOps platforms is fundamentally a people and process problem as much as a technology problem. The best infrastructure in the world won't help if data scientists don't trust it, don't use it, or can't debug it when things go wrong.

Start small, validate with real workflows, and earn trust incrementally. The platform will grow as the team's needs become clearer.
