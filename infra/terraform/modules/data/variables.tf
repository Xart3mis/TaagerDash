variable "prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "sg_rds_id" {
  type = string
}

variable "primary_db_name" {
  description = "Name of the primary database to create (additional DBs are created out-of-band)"
  type        = string
  default     = "taager_prod"
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}
