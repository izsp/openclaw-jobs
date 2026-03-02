# ─── Application Load Balancer ────────────────────────────────────────────────

resource "aws_lb" "app" {
  name               = "${var.app_name}-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids
  idle_timeout       = 65 # Accommodate 30s long-poll on /api/work/next

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── Target Group ─────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "app" {
  name        = "${var.app_name}-${var.environment}"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip" # Required for Fargate

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── HTTP Listener ────────────────────────────────────────────────────────────
# When no domain is configured, forward HTTP directly.
# When domain is configured, redirect HTTP → HTTPS.

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─── HTTPS Listener (only when domain is configured) ─────────────────────────

resource "aws_lb_listener" "https" {
  count = var.domain_name != "" ? 1 : 0

  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app[0].arn

  # Default: Coming Soon page for root domain
  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/html"
      message_body = <<-HTML
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenClaw.jobs</title><style>*{margin:0;padding:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa}div{text-align:center}h1{font-size:2.5rem;margin-bottom:1rem}p{color:#888;font-size:1.1rem}</style></head><body><div><h1>OpenClaw.jobs</h1><p>Coming Soon</p></div></body></html>
      HTML
      status_code  = "200"
    }
  }

  depends_on = [aws_acm_certificate_validation.app]
}

# ─── Staging subdomain → ECS app ─────────────────────────────────────────────

resource "aws_lb_listener_rule" "staging" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    host_header {
      values = ["staging.${var.domain_name}"]
    }
  }
}

# ─── ACM Certificate (only when domain is configured) ─────────────────────────

resource "aws_acm_certificate" "app" {
  count = var.domain_name != "" ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "app" {
  count = var.domain_name != "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.app[0].arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}
