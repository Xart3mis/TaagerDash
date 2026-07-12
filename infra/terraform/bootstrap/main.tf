# Bootstrap — apply ONCE manually with local AWS credentials.
# Creates: remote state bucket, DynamoDB lock table, GitHub OIDC provider,
# CI IAM role, ECR repositories with lifecycle policies.
# After this runs, all other Terraform uses remote state.

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Bootstrap itself uses local state (it creates the remote state bucket)
}

provider "aws" {
  region = var.aws_region
}

# ── Remote state bucket ──────────────────────────────────────────────────────

resource "aws_s3_bucket" "tf_state" {
  bucket = var.state_bucket_name
  # Prevent accidental deletion of state
  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── DynamoDB lock table (always-free tier: 25GB / 25 WCU/RCU) ───────────────

resource "aws_dynamodb_table" "tf_lock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

# ── GitHub OIDC provider ─────────────────────────────────────────────────────

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# ── CI IAM role (assumed by GitHub Actions via OIDC) ────────────────────────

resource "aws_iam_role" "ci" {
  name = "taagerdash-ci"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = local.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "ci" {
  name = "taagerdash-ci-policy"
  role = aws_iam_role.ci.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECR — push/pull images
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
        ]
        Resource = [
          aws_ecr_repository.backend.arn,
          aws_ecr_repository.migrate.arn,
        ]
      },
      # ECS — deploy services and run one-off tasks
      {
        Sid    = "ECS"
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:RunTask",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:StopTask",
        ]
        Resource = "*"
      },
      # Pass role to ECS tasks
      {
        Sid    = "PassRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "*"
        Condition = { StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" } }
      },
      # S3 — sync frontend assets
      {
        Sid    = "S3Frontend"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = "*"
      },
      # CloudFront — create invalidations
      {
        Sid    = "CloudFront"
        Effect = "Allow"
        Action = ["cloudfront:CreateInvalidation"]
        Resource = "*"
      },
      # Terraform — read state
      {
        Sid    = "TFState"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = [
          "${aws_s3_bucket.tf_state.arn}/*",
          aws_dynamodb_table.tf_lock.arn,
        ]
      },
      # SSM — read secrets at deploy time (for ECS task-def rendering)
      {
        Sid    = "SSMRead"
        Effect = "Allow"
        Action = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:*:*:parameter/taager/*"
      },
    ]
  })
}

# ── ECR repositories ─────────────────────────────────────────────────────────

resource "aws_ecr_repository" "backend" {
  name                 = "taagerdash/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "migrate" {
  name                 = "taagerdash/migrate"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = false }
}

# Keep only 10 images per repo — ECR free tier is 500MB
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "migrate" {
  repository = aws_ecr_repository.migrate.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
