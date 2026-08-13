# Security Group for Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "ticketdesk-m1-alb-sg"
  description = "Security Group for ticketdesk ALB allowing HTTP traffic"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow inbound HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ticketdesk-m1-alb-sg"
  }
}

# Security Group for Fargate Tasks
resource "aws_security_group" "task" {
  name        = "ticketdesk-m1-task-sg"
  description = "Security Group for ticketdesk tasks allowing port 8080 from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow port 8080 from ALB SG"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow all outbound traffic for image pulls and dependency access"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ticketdesk-m1-task-sg"
  }
}

# Security Group for RDS MySQL
resource "aws_security_group" "db" {
  name        = "ticketdesk-db-sg"
  description = "Security Group for MySQL RDS allowing port 3306 from task SG"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow port 3306 from ECS task SG"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.task.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ticketdesk-db-sg"
  }
}

