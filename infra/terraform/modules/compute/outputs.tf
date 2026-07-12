output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "task_execution_role_arn" {
  value = aws_iam_role.task_execution.arn
}

output "backend_service_names" {
  value = { for env, svc in aws_ecs_service.backend : env => svc.name }
}

output "migrate_task_def_arns" {
  value = { for env, td in aws_ecs_task_definition.migrate : env => td.arn }
}
