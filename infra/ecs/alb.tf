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
    type             = var.domain_name != "" ? "redirect" : "forward"
    target_group_arn = var.domain_name == "" ? aws_lb_target_group.app.arn : null

    dynamic "redirect" {
      for_each = var.domain_name != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
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

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  depends_on = [aws_acm_certificate_validation.app]
}

# ─── ACM Certificate (only when domain is configured) ─────────────────────────

resource "aws_acm_certificate" "app" {
  count = var.domain_name != "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

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

  certificate_arn = aws_acm_certificate.app[0].arn
}
