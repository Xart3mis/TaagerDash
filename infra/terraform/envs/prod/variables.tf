variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "ecr_backend_url" {
  description = "ECR URL for the backend image (output from bootstrap)"
  type        = string
}

variable "ecr_migrate_url" {
  description = "ECR URL for the migrate image (output from bootstrap)"
  type        = string
}
