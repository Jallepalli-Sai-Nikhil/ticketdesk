# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution_role" {
  name = "ticketdesk-m1-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "ticketdesk-m1-execution-role"
  }
}

# Attach AmazonECSTaskExecutionRolePolicy to Execution Role
resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Add CloudWatch Logs logging permissions if not already in the default policy
resource "aws_iam_policy" "ecs_logs_policy" {
  name        = "ticketdesk-m1-logs-policy"
  description = "Allows ECS tasks to write logs to CloudWatch logs group"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_logs_attachment" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_logs_policy.arn
}

# Task execution role policy to read secrets and parameters
resource "aws_iam_policy" "ecs_secrets_policy" {
  name        = "ticketdesk-m1-secrets-policy"
  description = "Allows ECS task execution role and task role to get secrets and parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_secrets" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_secrets_policy.arn
}

# Task Role for ECS task (runtime)
resource "aws_iam_role" "ecs_task_role" {
  name = "ticketdesk-m1-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "ticketdesk-m1-task-role"
  }
}

# Attach secrets policy to Task Role too, just in case application pulls at runtime
resource "aws_iam_role_policy_attachment" "ecs_task_secrets" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_secrets_policy.arn
}

# S3 Access Policy for issuing presigned URLs (read/write/delete objects in uploads bucket)
resource "aws_iam_policy" "ecs_s3_policy" {
  name        = "ticketdesk-m1-s3-policy"
  description = "Allows backend to read/write uploads bucket for presigned URLs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_s3" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_s3_policy.arn
}

