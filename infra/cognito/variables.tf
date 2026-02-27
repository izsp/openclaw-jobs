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
  ]
}

variable "logout_urls" {
  description = "Allowed logout redirect URLs"
  type        = list(string)
  default = [
    "http://localhost:3000",
  ]
}
