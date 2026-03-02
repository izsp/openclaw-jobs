variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"
}

variable "app_name" {
  description = "Application name prefix"
  type        = string
  default     = "openclaw-jobs"
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "cpu" {
  description = "Fargate task CPU (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MiB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 1
}

variable "domain_name" {
  description = "Domain name for HTTPS. Leave empty for ALB default DNS (HTTP only)."
  type        = string
  default     = "openclaw.jobs"
}

# ─── Secrets (passed via terraform.tfvars, stored in SSM) ─────────────────────

variable "mongodb_uri" {
  description = "MongoDB Atlas connection URI"
  type        = string
  sensitive   = true
}

variable "auth_secret" {
  description = "NextAuth/Auth.js JWT signing secret"
  type        = string
  sensitive   = true
}

variable "cognito_client_secret" {
  description = "Cognito app client secret"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

variable "cron_secret" {
  description = "Secret for cron endpoint authentication"
  type        = string
  sensitive   = true
}

variable "admin_secret" {
  description = "Secret for admin API authentication"
  type        = string
  sensitive   = true
}
