# ─── Route 53 Hosted Zone ─────────────────────────────────────────────────────
# DNS managed by Route 53 (nameservers must be set at GoDaddy registrar).
# Route 53 supports ALIAS records on the zone apex — required for ALB.

resource "aws_route53_zone" "app" {
  count = var.domain_name != "" ? 1 : 0

  name = var.domain_name

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── ACM DNS Validation Record ────────────────────────────────────────────────

resource "aws_route53_record" "acm_validation" {
  for_each = var.domain_name != "" ? {
    for dvo in aws_acm_certificate.app[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.app[0].zone_id
}

# ─── Root domain → ALB (ALIAS record, works on zone apex) ────────────────────

resource "aws_route53_record" "app" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.app[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# ─── Staging subdomain → ALB ─────────────────────────────────────────────────

resource "aws_route53_record" "staging" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.app[0].zone_id
  name    = "staging.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# ─── Human subdomain → ALB ──────────────────────────────────────────────────

resource "aws_route53_record" "human" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.app[0].zone_id
  name    = "human.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# ─── Human-staging subdomain → ALB ──────────────────────────────────────────

resource "aws_route53_record" "human_staging" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.app[0].zone_id
  name    = "human-staging.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
