# ─── SSM Parameter Store (Secrets) ────────────────────────────────────────────
# WHY SSM over Secrets Manager: SSM Parameter Store is free for standard
# parameters. Secrets Manager costs $0.40/secret/month.

resource "aws_ssm_parameter" "mongodb_uri" {
  name  = "/${var.app_name}/${var.environment}/MONGODB_URI"
  type  = "SecureString"
  value = var.mongodb_uri
  tags  = { Project = var.app_name, Environment = var.environment }
}

resource "aws_ssm_parameter" "auth_secret" {
  name  = "/${var.app_name}/${var.environment}/AUTH_SECRET"
  type  = "SecureString"
  value = var.auth_secret
  tags  = { Project = var.app_name, Environment = var.environment }
}

resource "aws_ssm_parameter" "cognito_client_secret" {
  name  = "/${var.app_name}/${var.environment}/COGNITO_CLIENT_SECRET"
  type  = "SecureString"
  value = var.cognito_client_secret
  tags  = { Project = var.app_name, Environment = var.environment }
}

resource "aws_ssm_parameter" "stripe_secret_key" {
  name  = "/${var.app_name}/${var.environment}/STRIPE_SECRET_KEY"
  type  = "SecureString"
  value = var.stripe_secret_key
  tags  = { Project = var.app_name, Environment = var.environment }
}

resource "aws_ssm_parameter" "stripe_webhook_secret" {
  name  = "/${var.app_name}/${var.environment}/STRIPE_WEBHOOK_SECRET"
  type  = "SecureString"
  value = var.stripe_webhook_secret
  tags  = { Project = var.app_name, Environment = var.environment }
}

resource "aws_ssm_parameter" "cron_secret" {
  name  = "/${var.app_name}/${var.environment}/CRON_SECRET"
  type  = "SecureString"
  value = var.cron_secret
  tags  = { Project = var.app_name, Environment = var.environment }
}

resource "aws_ssm_parameter" "admin_secret" {
  name  = "/${var.app_name}/${var.environment}/ADMIN_SECRET"
  type  = "SecureString"
  value = var.admin_secret
  tags  = { Project = var.app_name, Environment = var.environment }
}
