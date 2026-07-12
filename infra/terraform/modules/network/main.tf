# Uses the default VPC to avoid NAT Gateway costs (NAT = not free).
# Reuses existing default subnets in the region.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── Security groups ───────────────────────────────────────────────────────────

# ALB: accepts HTTP from the internet
resource "aws_security_group" "alb" {
  name        = "${var.prefix}-alb"
  description = "TaagerDash ALB"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Staging listener
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 container instance: accepts traffic from ALB only, egress open
resource "aws_security_group" "ec2" {
  name        = "${var.prefix}-ec2"
  description = "TaagerDash ECS container instance"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 8000
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS: accepts Postgres traffic from the EC2 instance only
resource "aws_security_group" "rds" {
  name        = "${var.prefix}-rds"
  description = "TaagerDash RDS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }
}
