resource "aws_db_subnet_group" "db_subnets" {
  name       = "ticketdesk-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  tags = {
    Name = "ticketdesk-db-subnet-group"
  }
}

resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "ticketdesk-db-password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "aws_db_instance" "db" {
  identifier             = "ticketdesk-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  db_name                = "ticketdb"
  username               = "admin"
  password               = random_password.db_password.result
  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot    = true
  multi_az               = false
  publicly_accessible    = false

  tags = {
    Name = "ticketdesk-db"
  }
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/ticketdesk/db_url"
  type  = "String"
  value = "jdbc:mysql://${aws_db_instance.db.endpoint}/ticketdb"
}

resource "aws_ssm_parameter" "db_user" {
  name  = "/ticketdesk/db_user"
  type  = "String"
  value = "admin"
}

resource "aws_ssm_parameter" "s3_bucket" {
  name  = "/ticketdesk/s3_bucket"
  type  = "String"
  value = aws_s3_bucket.uploads.id
}

resource "aws_ssm_parameter" "s3_region" {
  name  = "/ticketdesk/s3_region"
  type  = "String"
  value = var.aws_region
}
