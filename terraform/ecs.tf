# CloudWatch Log Group for container logs
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/ticketdesk-m1-backend"
  retention_in_days = 7

  tags = {
    Name = "ticketdesk-m1-log-group"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "ticketdesk-m1-cluster"

  tags = {
    Name = "ticketdesk-m1-cluster"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "ticketdesk-m1-backend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "ticketdesk-backend"
      image     = var.ecr_image_uri
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "SPRING_PROFILES_ACTIVE"
          value = "mysql"
        }
      ]
      secrets = [
        {
          name      = "DB_URL"
          valueFrom = aws_ssm_parameter.db_url.arn
        },
        {
          name      = "DB_USER"
          valueFrom = aws_ssm_parameter.db_user.arn
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        },
        {
          name      = "AWS_S3_BUCKET"
          valueFrom = aws_ssm_parameter.s3_bucket.arn
        },
        {
          name      = "AWS_S3_REGION"
          valueFrom = aws_ssm_parameter.s3_region.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = {
    Name = "ticketdesk-m1-backend-task"
  }
}

# ECS Service running Fargate tasks in Private Subnets
resource "aws_ecs_service" "main" {
  name                             = "ticketdesk-m1-service"
  cluster                          = aws_ecs_cluster.main.id
  task_definition                  = aws_ecs_task_definition.app.arn
  launch_type                      = "FARGATE"
  desired_count                    = 1
  health_check_grace_period_seconds = 180

  network_configuration {
    subnets          = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "ticketdesk-backend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "ticketdesk-m1-service"
  }
}
