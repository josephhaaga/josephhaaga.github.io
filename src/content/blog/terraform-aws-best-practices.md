---
title: 'Infrastructure as Code: Terraform Best Practices for Data Teams'
description: 'How to structure Terraform modules and manage AWS infrastructure for data engineering teams'
pubDate: '2024-02-20'
tags: ['terraform', 'aws', 'iac', 'data-engineering']
draft: true
---

Infrastructure as Code has transformed how data teams manage their AWS resources. Terraform, in particular, has become the tool of choice for data engineers who want repeatable, auditable infrastructure. Here's what I've learned from managing Terraform at several companies, and the practices that have made the biggest difference.

## Why Terraform for Data Teams?

Data infrastructure is surprisingly complex. A typical data team might manage:

- EMR or Spark clusters for batch processing
- S3 buckets with complex lifecycle policies
- IAM roles and policies for data access
- RDS or Redshift clusters
- Glue crawlers and catalog entries
- MSK (Kafka) clusters for streaming
- SageMaker endpoints for model serving

Managing all of this through the AWS console doesn't scale. Terraform gives you a clear record of what's deployed, the ability to reproduce environments, and a review process for infrastructure changes.

## Module Structure That Works

The module structure that's worked best for me across multiple organizations:

```
infrastructure/
  modules/
    data-lake/          # S3 buckets, lifecycle, replication
    spark-cluster/      # EMR cluster configuration
    ml-platform/        # SageMaker, ECR, model serving
    networking/         # VPC, subnets, security groups
    iam/                # Roles, policies, instance profiles
  environments/
    dev/
      main.tf
      variables.tf
      terraform.tfvars
    staging/
      main.tf
    production/
      main.tf
  shared/               # Resources shared across environments
    backend.tf          # Remote state config
    providers.tf
```

The key principle: **modules are reusable, environments are where you configure them**.

## State Management

Remote state is non-negotiable for teams. S3 + DynamoDB is the standard pattern:

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "data-platform/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

A few hard-learned rules about state:

1. **Never share state files between unrelated systems**. One state file per application/environment pair.
2. **Use workspaces sparingly**. They're convenient but make it easy to accidentally apply to the wrong environment.
3. **Lock the state** before any apply. The DynamoDB lock prevents concurrent modifications.
4. **Back up your state**. Enable versioning on the S3 bucket and set a lifecycle rule to retain 30 days of history.

## Variable Management

Data infrastructure often involves sensitive values (database passwords, API keys). Never store them in `.tfvars` files committed to git. Use AWS Secrets Manager or Parameter Store and reference them:

```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # ...
}
```

For non-sensitive configuration, use a clear naming convention that maps to environments:

```hcl
variable "emr_instance_type" {
  description = "EC2 instance type for EMR core nodes"
  type        = string
  default     = "m5.2xlarge"
}
```

## CI/CD for Infrastructure

Infrastructure should go through the same review process as application code. Our setup:

1. **PR triggers `terraform plan`** — plan output is posted as a PR comment
2. **Merge to main triggers `terraform apply`** — but only after approval
3. **Separate pipelines per environment** — dev applies automatically, production requires manual approval

We use GitHub Actions with an OIDC provider (no long-lived AWS credentials):

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v2
  with:
    role-to-assume: arn:aws:iam::123456789:role/terraform-github-actions
    aws-region: us-east-1
```

## Data-Specific Terraform Patterns

### S3 Data Lake Module

```hcl
resource "aws_s3_bucket" "data_lake" {
  bucket = "${var.environment}-${var.team}-data-lake"
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}
```

### IAM for Data Access

Create fine-grained IAM roles per service rather than one powerful role:

```hcl
# Read-only role for data scientists
resource "aws_iam_role" "data_science_readonly" {
  name = "data-science-readonly-${var.environment}"
  # ...
}

resource "aws_iam_role_policy" "data_science_readonly" {
  role = aws_iam_role.data_science_readonly.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.data_lake.arn,
          "${aws_s3_bucket.data_lake.arn}/*"
        ]
      }
    ]
  })
}
```

## Common Pitfalls

**Don't use `count` for resources that might be reordered**. If you have `count = length(var.buckets)` and you remove the first item, Terraform will destroy and recreate everything after it. Use `for_each` with a map instead.

**Tag everything**. Add tags for environment, team, cost center, and managed-by=terraform. Your finance team will thank you.

**Use `terraform fmt` and `tflint` in CI**. Consistent formatting reduces noise in code reviews. Linting catches common errors before they reach production.

**Plan before you apply, always**. Make reading `terraform plan` output a habit. The destructive operations (`-/+` and `-`) deserve a second look.

## Summary

Terraform pays dividends for data teams that invest in good module structure, proper state management, and CI/CD integration. The upfront work is real, but the alternative — manual AWS console changes with no audit trail — doesn't scale.

Start with the shared modules, get remote state working, and add CI/CD incrementally. Within a few months, you'll wonder how you managed infrastructure any other way.
