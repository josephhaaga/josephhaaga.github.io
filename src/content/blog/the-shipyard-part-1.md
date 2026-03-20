---
title: 'The Shipyard — Part 1'
description: 'Our north star is to map, model, and monitor global supply chains in real-time'
pubDate: '2021-12-15'
heroImage: '/blog-images/shipyard-part1-architecture.svg'
tags: ['mlops', 'platform', 'supply-chain', 'machine-learning']
---

*Originally published on the [Interos Engineering blog](https://medium.com/interos-engineering/the-shipyard-part-1-b12d381624f0).*

---

Our north star is to map, model, and monitor global supply chains in real-time. Given the sheer scale of the problem, it's no surprise that a human, analyst-led approach faces limitations in scope. We set out to build a platform that could support this mission at machine speed and machine scale.

This is the story of building that platform — internally we call it **The Shipyard**.

## The Problem Space

Interos builds AI-powered supply chain risk intelligence. Our customers need to understand not just their direct suppliers, but their suppliers' suppliers, and every financial, cyber, geopolitical, and operational risk that touches that extended network. A global supply chain can span hundreds of thousands of entities across dozens of countries.

A team of human analysts, however skilled, cannot maintain a live view of this at scale. The traditional approach — pull a report, have an analyst review it, generate a risk score — breaks down when you need continuous monitoring of millions of supply chain relationships.

The vision we committed to: fully automated pipelines taking raw data in and producing fresh, actionable risk assessments out.

## Why We Built Our Own Platform

Our first instinct, like most engineering teams, was to reach for existing tools. We evaluated managed ML platforms, off-the-shelf orchestration systems, and various SaaS solutions. Every one of them left significant gaps.

The core issue wasn't feature parity — it was that our requirements around data governance, model traceability, and operational compliance were specific enough that retrofitting any vendor solution would have cost more than building our own.

A few concrete examples of what drove us to build:

- **Model lineage**: We needed to trace every prediction back to the training data, the model version, and the pipeline run that produced it. Few platforms support this at the granularity we required.
- **Compliance gates**: Our deployment process needed mandatory review steps that couldn't be bypassed. We needed this enforced in the tooling, not just in a runbook.
- **Scale**: We process millions of entities continuously. Most hosted platforms had pricing or architecture constraints that made this prohibitively expensive.

## The Architecture: Map, Model, Monitor

We organized the platform around three functional layers, mirroring our product's core capabilities:

![Platform Architecture — Map, Model, Monitor pipeline with Kubeflow, EKS, and internal tooling](/blog-images/shipyard-part1-architecture.svg)

### Map

The mapping layer is responsible for building and maintaining our graph of the global supply chain. It ingests raw data from hundreds of sources — news feeds, corporate filings, shipping manifests, sanctions lists — and produces a continuously updated graph of companies, their relationships, and key attributes.

This is fundamentally a data engineering problem at massive scale: entity resolution (are "Apple Inc." and "APPLE INC." the same entity?), relationship inference, and incremental graph construction.

### Model

The modeling layer applies machine learning to the supply chain graph to produce risk scores and predictions. Models here range from simple classifiers to complex graph neural networks.

What makes this layer interesting is the data distribution challenge: supply chains change constantly. New sanctions regimes, natural disasters, financial distress — the world that the models are trained on can shift significantly in a short period. We built aggressive monitoring into this layer to detect when model performance is drifting.

### Monitor

The monitoring layer translates model outputs into customer-facing alerts and dashboards. It runs continuously, and when it detects a change that crosses a customer's configured risk thresholds, it fires an alert.

This layer needs to be operationally bulletproof. Customers depend on these alerts for real business decisions — a missed alert for a key supplier going bankrupt is not an acceptable failure mode.

## The Team

I lead the ML Platform team at Interos. We spent the better part of a year building the core infrastructure, and this series documents what we learned.

The team that built this is small — a handful of engineers across ML infrastructure and data engineering. We had to make tradeoffs between what was ideally right and what was practically achievable with our capacity. I'll try to be honest about those tradeoffs throughout this series.

## What's Next

In the next installment, we'll go deep on the CI/CD pipeline that powers model delivery in The Shipyard: how we automated the path from a data scientist's notebook to a production-serving model, and how we built a tool called **Snitch** to enforce adherence to our deployment standards.

---

*[Continue to Part 2 →](/blog/the-shipyard-part-2)*
