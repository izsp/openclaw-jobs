# ─── S3 Bucket for Task Attachments ──────────────────────────────────────────
# Stores binary files (images, PDFs, ZIPs, etc.) uploaded by workers.
# Objects auto-expire after 30 days to align with task purge schedule.

resource "aws_s3_bucket" "attachments" {
  bucket = "${var.app_name}-${var.environment}-attachments"

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── Block Public Access ─────────────────────────────────────────────────────

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── Server-Side Encryption (SSE-S3) ────────────────────────────────────────

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─── Lifecycle Rule — 30 Day Expiration ──────────────────────────────────────

resource "aws_s3_bucket_lifecycle_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    id     = "expire-after-30-days"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}
