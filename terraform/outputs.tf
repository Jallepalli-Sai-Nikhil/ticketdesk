output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The public DNS name of the Application Load Balancer."
}

output "health_check_url" {
  value       = "http://${aws_lb.main.dns_name}/health"
  description = "The endpoint URL for the health check."
}

output "s3_website_endpoint" {
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
  description = "The S3 website endpoint."
}

output "s3_website_url" {
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
  description = "The HTTP URL of the frontend S3 website."
}

output "frontend_s3_bucket" {
  value       = aws_s3_bucket.frontend.id
  description = "The name of the frontend S3 bucket."
}

output "uploads_s3_bucket" {
  value       = aws_s3_bucket.uploads.id
  description = "The name of the uploads S3 bucket."
}

output "rds_endpoint" {
  value       = aws_db_instance.db.endpoint
  description = "The connection endpoint for the RDS instance."
}
