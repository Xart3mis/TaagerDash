output "param_arns" {
  description = "Map of param name → ARN for use in ECS task definition secrets"
  value       = { for k, v in aws_ssm_parameter.secrets : k => v.arn }
}

output "param_path_prefix" {
  value = "/taager/${var.environment}"
}
