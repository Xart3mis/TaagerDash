variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "S3 bucket for Terraform remote state (must be globally unique)"
  type        = string
  default     = "taagerdash-tf-state"
}

variable "lock_table_name" {
  description = "DynamoDB table for Terraform state locking"
  type        = string
  default     = "taagerdash-tf-lock"
}

variable "github_repo" {
  description = "GitHub repo in owner/name format (e.g. acme/taagerdash)"
  type        = string
}

variable "create_oidc_provider" {
  description = "Set false if an OIDC provider for GitHub Actions already exists in this account"
  type        = bool
  default     = true
}
