# ─── Outputs ──────────────────────────────────────────────────────────────────
# These values are needed for .env.local / Cloudflare env vars.

output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.openclaw.id
}

output "user_pool_endpoint" {
  description = "Cognito User Pool endpoint (OIDC issuer)"
  value       = "https://${aws_cognito_user_pool.openclaw.endpoint}"
}

output "client_id" {
  description = "Cognito App Client ID (COGNITO_CLIENT_ID)"
  value       = aws_cognito_user_pool_client.app.id
}

output "client_secret" {
  description = "Cognito App Client Secret (COGNITO_CLIENT_SECRET)"
  value       = aws_cognito_user_pool_client.app.client_secret
  sensitive   = true
}

output "cognito_issuer" {
  description = "COGNITO_ISSUER for Auth.js (https://cognito-idp.<region>.amazonaws.com/<pool-id>)"
  value       = "https://cognito-idp.us-west-2.amazonaws.com/${aws_cognito_user_pool.openclaw.id}"
}

output "hosted_ui_domain" {
  description = "Cognito Hosted UI base URL"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.us-west-2.amazoncognito.com"
}
