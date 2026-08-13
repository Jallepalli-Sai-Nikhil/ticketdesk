# CloudWatch Dashboard with core metrics
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "ticketdesk-m1-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "ALB Request Count"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.main.arn_suffix, { "label": "5XX errors" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", aws_lb.main.arn_suffix, { "label": "4XX errors" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "ALB Target Error Counts"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix, { "stat": "Average", "label": "Avg Latency" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix, { "stat": "p90", "label": "p90 Latency" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix, { "stat": "p99", "label": "p99 Latency" }]
          ]
          period = 300
          region = var.aws_region
          title  = "Target Response Time"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.main.name, { "label": "CPU Utilization" }],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.main.name, { "label": "Memory Utilization" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS CPU and Memory Utilization"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.db_instance_identifier, { "label": "DB Connections" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Database Connections"
          view   = "timeSeries"
        }
      }
    ]
  })
}

# Alarm: 5xx errors (ALB)
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "ticketdesk-m1-alb-high-5xx"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alarm when target 5xx responses exceed 5 in a minute"
  actions_enabled     = false

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# Alarm: Unhealthy Targets (ALB)
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "ticketdesk-m1-unhealthy-targets"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "UnhealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "Alarm when unhealthy host count is 1 or more"
  actions_enabled     = false

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.main.arn_suffix
  }
}

# Alarm: RDS High CPU
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "ticketdesk-m1-rds-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm when RDS CPU utilization exceeds 80% for 10 minutes"
  actions_enabled     = false

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}
