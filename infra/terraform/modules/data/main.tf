# Single RDS db.t3.micro instance (free-tier: 750 hrs/mo, 20GB).
# Both staging and prod use separate databases on this one instance.
# The instance is created by the "prod" env; staging shares it.

resource "aws_db_subnet_group" "main" {
  name       = "${var.prefix}-db-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "main" {
  identifier        = "${var.prefix}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = var.primary_db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.sg_rds_id]

  publicly_accessible     = false
  skip_final_snapshot     = true
  backup_retention_period = 7
  deletion_protection     = true

  # Free-tier single-AZ — no Multi-AZ
  multi_az = false

  tags = {
    Project     = "taagerdash"
    Environment = var.environment
  }
}
