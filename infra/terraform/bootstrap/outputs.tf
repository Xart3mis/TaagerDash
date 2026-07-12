output "state_bucket" {
  value = aws_s3_bucket.tf_state.bucket
}

output "lock_table" {
  value = aws_dynamodb_table.tf_lock.name
}

output "ci_role_arn" {
  value = aws_iam_role.ci.arn
}

output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_migrate_url" {
  value = aws_ecr_repository.migrate.repository_url
}
