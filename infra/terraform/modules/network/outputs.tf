output "vpc_id" {
  value = data.aws_vpc.default.id
}

output "subnet_ids" {
  value = data.aws_subnets.default.ids
}

output "sg_alb_id" {
  value = aws_security_group.alb.id
}

output "sg_ec2_id" {
  value = aws_security_group.ec2.id
}

output "sg_rds_id" {
  value = aws_security_group.rds.id
}
