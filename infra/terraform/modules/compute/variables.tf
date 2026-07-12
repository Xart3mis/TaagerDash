variable "prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "sg_alb_id" {
  type = string
}

variable "sg_ec2_id" {
  type = string
}

variable "ecr_backend_url" {
  type = string
}

variable "ecr_migrate_url" {
  type = string
}

# SSM parameter ARNs per environment, keyed by secret name.
# Shape: { prod = { SECRET_KEY = "arn:...", ... }, staging = { ... } }
variable "ssm_param_arns" {
  type = map(map(string))
}
