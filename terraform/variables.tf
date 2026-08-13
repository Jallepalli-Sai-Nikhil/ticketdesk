variable "aws_region" {
  type        = string
  default     = "ap-south-1"
  description = "The target AWS Region for deployment."
}

variable "ecr_image_uri" {
  type        = string
  default     = "473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend:188bad7"
  description = "The full URI of the ECR Docker image to run."
}

variable "db_instance_identifier" {
  type        = string
  default     = "ticketdesk-db"
  description = "RDS DB instance identifier for monitoring"
}

