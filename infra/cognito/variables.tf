# ─── Input Variables ──────────────────────────────────────────────────────────

variable "google_client_id" {
  description = "Google OAuth Client ID for federated login (optional — leave empty to skip Google)"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "callback_urls" {
  description = "Allowed OAuth callback URLs for the app client"
  type        = list(string)
  default = [
    "http://localhost:3000/api/auth/callback/cognito",
    "https://openclaw-jobs.zzsspp99.workers.dev/api/auth/callback/cognito",
    # ECS ALB — add HTTPS URL once domain + ACM certificate is configured
  ]
}

variable "logout_urls" {
  description = "Allowed logout redirect URLs"
  type        = list(string)
  default = [
    "http://localhost:3000",
    "https://openclaw-jobs.zzsspp99.workers.dev",
    # ECS ALB — add HTTPS URL once domain + ACM certificate is configured
  ]
}
