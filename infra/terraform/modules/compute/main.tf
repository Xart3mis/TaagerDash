# ECS cluster backed by a single EC2 t3.micro (free-tier).
# ONE cluster hosts both staging and prod services, isolated by target groups.
# ALB with two listeners: :80 → prod, :8080 → staging.

data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-ecs-hvm-*-x86_64"]
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ── IAM: EC2 container instance profile ──────────────────────────────────────

resource "aws_iam_role" "ec2_instance" {
  name = "${var.prefix}-ecs-instance"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ec2_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ec2_instance" {
  name = "${var.prefix}-ecs-instance"
  role = aws_iam_role.ec2_instance.name
}

# ── IAM: ECS task execution role (pull ECR, read SSM, write CW logs) ─────────

resource "aws_iam_role" "task_execution" {
  name = "${var.prefix}-ecs-task-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution_base" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_execution_ssm" {
  name = "${var.prefix}-task-execution-ssm"
  role = aws_iam_role.task_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = "arn:aws:ssm:*:*:parameter/taager/*"
    }]
  })
}

# ── CloudWatch log groups (7-day retention to stay inside 5GB free tier) ─────

resource "aws_cloudwatch_log_group" "backend" {
  for_each          = toset(["prod", "staging"])
  name              = "/taagerdash/${each.key}/backend"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "migrate" {
  for_each          = toset(["prod", "staging"])
  name              = "/taagerdash/${each.key}/migrate"
  retention_in_days = 7
}

# ── ECS cluster ───────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = var.prefix
  setting {
    name  = "containerInsights"
    value = "disabled" # Container Insights costs money
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.ec2.name]

  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }
}

# ── EC2 Auto Scaling Group (min=max=1 → always one free-tier instance) ────────

resource "aws_launch_template" "ecs" {
  name_prefix   = "${var.prefix}-ecs-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = "t3.micro"

  iam_instance_profile { arn = aws_iam_instance_profile.ec2_instance.arn }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [var.sg_ec2_id]
  }

  # Register with cluster + add 512MB swap to cope with 1GB RAM
  user_data = base64encode(<<-EOT
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    # Create 512MB swapfile
    fallocate -l 512M /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
  EOT
  )

  lifecycle { create_before_destroy = true }
}

resource "aws_autoscaling_group" "ecs" {
  name                = "${var.prefix}-ecs"
  min_size            = 1
  max_size            = 1
  desired_capacity    = 1
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = ""
    propagate_at_launch = true
  }

  lifecycle { create_before_destroy = true }
}

resource "aws_ecs_capacity_provider" "ec2" {
  name = "${var.prefix}-ec2"
  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs.arn
    managed_scaling {
      status          = "ENABLED"
      target_capacity = 80
    }
  }
}

# ── ALB + target groups + listeners ──────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${var.prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.sg_alb_id]
  subnets            = var.subnet_ids
}

resource "aws_lb_target_group" "prod" {
  name        = "${var.prefix}-tg-prod"
  port        = 8000
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/health"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "staging" {
  name        = "${var.prefix}-tg-staging"
  port        = 8001
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/health"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "prod" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.prod.arn
  }
}

resource "aws_lb_listener" "staging" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8080
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.staging.arn
  }
}

# ── ECS task definitions ──────────────────────────────────────────────────────

locals {
  envs = ["prod", "staging"]

  # prod on host port 8000, staging on 8001 (both forward to container 8000)
  host_ports = {
    prod    = 8000
    staging = 8001
  }
}

resource "aws_ecs_task_definition" "backend" {
  for_each             = toset(local.envs)
  family               = "${var.prefix}-backend-${each.key}"
  network_mode         = "bridge"
  execution_role_arn   = aws_iam_role.task_execution.arn

  # 320MB memory per container — leaves headroom on the 1GB t3.micro
  container_definitions = jsonencode([{
    name      = "backend"
    image     = "${var.ecr_backend_url}:${each.key}-latest"
    essential = true
    memory    = 320
    cpu       = 256

    portMappings = [{
      hostPort      = local.host_ports[each.key]
      containerPort = 8000
      protocol      = "tcp"
    }]

    secrets = [
      for k, arn in var.ssm_param_arns[each.key] : {
        name      = k
        valueFrom = arn
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/taagerdash/${each.key}/backend"
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }
  }])
}

resource "aws_ecs_task_definition" "migrate" {
  for_each           = toset(local.envs)
  family             = "${var.prefix}-migrate-${each.key}"
  network_mode       = "bridge"
  execution_role_arn = aws_iam_role.task_execution.arn

  container_definitions = jsonencode([{
    name      = "migrate"
    image     = "${var.ecr_migrate_url}:${each.key}-latest"
    essential = true
    memory    = 256
    cpu       = 128
    command   = ["alembic", "upgrade", "head"]

    secrets = [
      for k, arn in var.ssm_param_arns[each.key] : {
        name      = k
        valueFrom = arn
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/taagerdash/${each.key}/migrate"
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# ── ECS services ──────────────────────────────────────────────────────────────

resource "aws_ecs_service" "backend" {
  for_each = toset(local.envs)

  name            = "${var.prefix}-backend-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend[each.key].arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = each.key == "prod" ? aws_lb_target_group.prod.arn : aws_lb_target_group.staging.arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.prod, aws_lb_listener.staging]

  lifecycle {
    # CI updates task definition revisions; don't let Terraform revert them
    ignore_changes = [task_definition]
  }
}
