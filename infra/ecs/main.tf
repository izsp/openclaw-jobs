# ─── CloudWatch Log Group ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.app_name}-${var.environment}"
  retention_in_days = 14

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── ECS Cluster ──────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "disabled" # Cost-saving: enable later if needed
  }

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── ECS Task Definition ──────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.app_name}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = tostring(var.container_port) },
      { name = "HOSTNAME", value = "0.0.0.0" },
      { name = "NEXTAUTH_URL", value = var.domain_name != "" ? "https://staging.${var.domain_name}" : "http://${aws_lb.app.dns_name}" },
      { name = "AUTH_TRUST_HOST", value = "true" },
      { name = "COGNITO_CLIENT_ID", value = "26hg9s9vp9gm7gjqjdc1hg432q" },
      { name = "COGNITO_ISSUER", value = "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_dIkBX958X" },
      { name = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", value = "pk_test_51T5OedAjqXvWRKMD5x2mYjDdeD7k2khqLZ8YyEhuqMrcWasC34bkJFYhnRqn32ZOxK0CMXto4zkv8lMpnZtD0XoO00k4k2Bclx" },
      { name = "STRIPE_PRICE_500", value = "price_1T5PCuAjqXvWRKMD5QPk6Smh" },
      { name = "STRIPE_PRICE_2000", value = "price_1T5PCvAjqXvWRKMDbE68Pe2B" },
      { name = "STRIPE_PRICE_10000", value = "price_1T5PCvAjqXvWRKMDeWdBAgZN" },
      { name = "STRIPE_PRICE_50000", value = "price_1T5PCwAjqXvWRKMD8YHLc2To" },
    ]

    secrets = [
      { name = "MONGODB_URI", valueFrom = aws_ssm_parameter.mongodb_uri.arn },
      { name = "AUTH_SECRET", valueFrom = aws_ssm_parameter.auth_secret.arn },
      { name = "NEXTAUTH_SECRET", valueFrom = aws_ssm_parameter.auth_secret.arn },
      { name = "COGNITO_CLIENT_SECRET", valueFrom = aws_ssm_parameter.cognito_client_secret.arn },
      { name = "STRIPE_SECRET_KEY", valueFrom = aws_ssm_parameter.stripe_secret_key.arn },
      { name = "STRIPE_WEBHOOK_SECRET", valueFrom = aws_ssm_parameter.stripe_webhook_secret.arn },
      { name = "CRON_SECRET", valueFrom = aws_ssm_parameter.cron_secret.arn },
      { name = "ADMIN_SECRET", valueFrom = aws_ssm_parameter.admin_secret.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── ECS Service ──────────────────────────────────────────────────────────────

resource "aws_ecs_service" "app" {
  name            = "${var.app_name}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true # Required for default VPC (no NAT gateway)
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 0   # Allow 0 during deploy (single task)
  deployment_maximum_percent         = 200 # Allow 2 tasks during rolling deploy

  # Prevent Terraform from reverting image updates from CI/CD
  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}
