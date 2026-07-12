# Production environment root.
# This env root also owns the shared singleton resources (EC2, RDS, ALB)
# because we run one set of infrastructure for both staging + prod.

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }

  backend "s3" {
    bucket         = "taagerdash-tf-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "taagerdash-tf-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Shared network (default VPC) ─────────────────────────────────────────────

module "network" {
  source = "../../modules/network"
  prefix = "taagerdash"
}

# ── Secrets — prod ───────────────────────────────────────────────────────────

module "secrets_prod" {
  source      = "../../modules/secrets"
  environment = "prod"
}

# ── Secrets — staging (created here so one state file owns all SSM params) ───

module "secrets_staging" {
  source      = "../../modules/secrets"
  environment = "staging"
}

# ── Database (shared instance, prod is primary DB) ───────────────────────────

module "data" {
  source          = "../../modules/data"
  prefix          = "taagerdash"
  environment     = "prod"
  subnet_ids      = module.network.subnet_ids
  sg_rds_id       = module.network.sg_rds_id
  primary_db_name = "taager_prod"
  db_username     = var.db_username
  db_password     = var.db_password
}

# ── Compute (shared ECS cluster + ALB hosting both envs) ─────────────────────

module "compute" {
  source          = "../../modules/compute"
  prefix          = "taagerdash"
  vpc_id          = module.network.vpc_id
  subnet_ids      = module.network.subnet_ids
  sg_alb_id       = module.network.sg_alb_id
  sg_ec2_id       = module.network.sg_ec2_id
  ecr_backend_url = var.ecr_backend_url
  ecr_migrate_url = var.ecr_migrate_url

  ssm_param_arns = {
    prod    = module.secrets_prod.param_arns
    staging = module.secrets_staging.param_arns
  }
}

# ── Frontend (prod) ───────────────────────────────────────────────────────────

module "frontend_prod" {
  source      = "../../modules/frontend"
  prefix      = "taagerdash"
  environment = "prod"
}

# ── Frontend (staging) ────────────────────────────────────────────────────────

module "frontend_staging" {
  source      = "../../modules/frontend"
  prefix      = "taagerdash"
  environment = "staging"
}
