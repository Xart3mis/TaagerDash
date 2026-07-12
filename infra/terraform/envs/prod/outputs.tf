output "alb_dns_name" {
  description = "ALB DNS — prod API on :80, staging API on :8080"
  value       = module.compute.alb_dns_name
}

output "frontend_prod_domain" {
  value = module.frontend_prod.cloudfront_domain
}

output "frontend_staging_domain" {
  value = module.frontend_staging.cloudfront_domain
}

output "db_host" {
  value = module.data.db_host
}

output "ecs_cluster_name" {
  value = module.compute.ecs_cluster_name
}
