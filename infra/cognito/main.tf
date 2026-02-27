# ─── AWS Cognito User Pool for OpenClaw.jobs ─────────────────────────────────
# Provides email+password and Google federated login via Cognito Hosted UI.
# All auth flows go through Cognito → Auth.js sees a single OIDC provider.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = "us-west-2"
  profile = "openclaw-jobs"
}

# ─── User Pool ────────────────────────────────────────────────────────────────

resource "aws_cognito_user_pool" "openclaw" {
  name = "openclaw-jobs-staging"

  # Email as the primary sign-in identifier
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = false
    temporary_password_validity_days = 7
  }

  # Email verification via code (not link)
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "OpenClaw.jobs — Verify your email"
    email_message        = "Your verification code is {####}"
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Project     = "openclaw-jobs"
    Environment = "staging"
  }
}

# ─── User Pool Domain (Hosted UI) ────────────────────────────────────────────

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "openclaw-jobs-staging"
  user_pool_id = aws_cognito_user_pool.openclaw.id
}

# ─── Google Identity Provider (federated) ─────────────────────────────────────

resource "aws_cognito_identity_provider" "google" {
  count = var.google_client_id != "" ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.openclaw.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

# ─── App Client ───────────────────────────────────────────────────────────────

resource "aws_cognito_user_pool_client" "app" {
  name         = "openclaw-jobs-staging-app"
  user_pool_id = aws_cognito_user_pool.openclaw.id

  generate_secret                      = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true

  # COGNITO = email+password; Google = federated (added conditionally)
  supported_identity_providers = var.google_client_id != "" ? ["COGNITO", "Google"] : ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # Token validity
  access_token_validity  = 1  # hours
  id_token_validity      = 1  # hours
  refresh_token_validity = 30 # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  depends_on = [aws_cognito_identity_provider.google]
}
