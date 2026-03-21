---
title: 'Kubernetes for Machine Learning: A Practical Guide'
description: 'Practical tips for running ML workloads on Kubernetes, including GPU scheduling and resource management'
pubDate: '2024-02-01'
tags: ['kubernetes', 'ml', 'eks', 'gpu']
draft: true
---

Kubernetes has become the de facto platform for running ML workloads in production. Whether you're training models, serving predictions, or orchestrating pipelines, chances are Kubernetes is involved. This guide covers the practical aspects I've learned from running ML workloads at scale on AWS EKS and GCP GKE.

## Why Kubernetes for ML?

Before jumping into the how, let's be clear about the why. Kubernetes offers:

- **Resource isolation**: Different teams can share infrastructure without stepping on each other
- **Scalability**: Scale training jobs up and serving pods out without manual intervention
- **Reproducibility**: Container images ensure consistent environments from dev to prod
- **Ecosystem**: Tools like Kubeflow, Argo, and KServe are built for k8s

The tradeoffs are real: operational complexity is high, and the learning curve is steep. But for teams doing serious ML at scale, the benefits outweigh the costs.

## Setting Up EKS for ML

When setting up an EKS cluster for ML workloads, the most important decisions are around node groups:

```bash
# Create a CPU node group for general workloads
eksctl create nodegroup \
  --cluster ml-cluster \
  --name cpu-workers \
  --node-type m5.2xlarge \
  --nodes-min 2 \
  --nodes-max 20 \
  --asg-access

# Create a GPU node group for training
eksctl create nodegroup \
  --cluster ml-cluster \
  --name gpu-workers \
  --node-type p3.2xlarge \
  --nodes-min 0 \
  --nodes-max 10 \
  --node-labels "workload=gpu-training" \
  --asg-access
```

Key things to configure:
- **Cluster Autoscaler**: Automatically scales node groups based on pending pods
- **NVIDIA GPU Plugin**: Required for GPU scheduling
- **EFA support** (for multi-node training): Enables high-bandwidth networking between pods

## GPU Scheduling Best Practices

GPU resources are expensive. You want to maximize utilization without starving other workloads.

### Taints and Tolerations

Keep GPU nodes reserved for GPU workloads:

```yaml
# Taint applied to GPU nodes
taints:
  - key: "nvidia.com/gpu"
    value: "true"
    effect: "NoSchedule"

# Toleration in your training job Pod spec
tolerations:
  - key: "nvidia.com/gpu"
    operator: "Exists"
    effect: "NoSchedule"
```

### Resource Requests and Limits

Always set GPU resource requests explicitly:

```yaml
resources:
  requests:
    memory: "16Gi"
    cpu: "4"
    nvidia.com/gpu: "1"
  limits:
    memory: "32Gi"
    cpu: "8"
    nvidia.com/gpu: "1"
```

Set requests equal to limits for GPU resources — fractional GPU sharing is complex and often not worth it for training jobs.

### Node Affinity

Route training jobs to GPU nodes using affinity rules:

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: workload
              operator: In
              values:
                - gpu-training
```

## Managing Ephemeral Storage

Training jobs often need significant scratch space — for datasets, checkpoints, and logs. Ephemeral storage needs to be planned:

```yaml
resources:
  requests:
    ephemeral-storage: "50Gi"
  limits:
    ephemeral-storage: "100Gi"
```

For large datasets, use PVCs backed by EFS (for shared access) or EBS (for high-performance single-pod access). Don't try to fit a 500GB dataset in an ephemeral volume.

## Pod Disruption and Checkpointing

Training jobs can run for hours or days. Spot instances can interrupt them. Plan for it:

1. **Use spot instances** for training (70-80% cost savings) with proper interruption handling
2. **Checkpoint frequently** — every epoch at minimum, ideally more often
3. **Use restart policies** that resume from the last checkpoint

```python
# Example checkpointing logic
def save_checkpoint(model, optimizer, epoch, path):
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
    }, path)

# On startup, check for existing checkpoint
checkpoint_path = "/checkpoints/latest.pt"
if os.path.exists(checkpoint_path):
    checkpoint = torch.load(checkpoint_path)
    model.load_state_dict(checkpoint['model_state_dict'])
    start_epoch = checkpoint['epoch'] + 1
```

## Serving Models at Scale

For inference, the pattern is different. You want:

- **Horizontal pod autoscaling** based on request rate or queue depth
- **Resource limits** tuned tightly to avoid over-provisioning
- **Readiness probes** that verify the model is loaded before accepting traffic
- **Preemption policies** that prevent inference pods from being evicted during CPU pressure

```yaml
# Readiness probe for a model server
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 60  # Time for model to load
  periodSeconds: 10
  failureThreshold: 3
```

## Monitoring and Observability

GPU utilization monitoring is critical. Add DCGM exporter to get GPU metrics in Prometheus:

```bash
helm install dcgm-exporter gpu-helm-charts/dcgm-exporter
```

Key metrics to alert on:
- `DCGM_FI_DEV_GPU_UTIL` — GPU utilization (alert if < 50% during training)
- `DCGM_FI_DEV_MEM_COPY_UTIL` — Memory bandwidth utilization
- Pod OOMKilled events — sign that memory limits are too tight

## Summary

Running ML on Kubernetes is complex but manageable with the right setup. Focus on:
1. Proper node group segmentation (CPU vs GPU)
2. Explicit resource management with taints/tolerations
3. Fault-tolerant training with checkpointing
4. Tight observability on GPU utilization

Get these right and Kubernetes becomes a massive force multiplier for your ML team.
