# ─── Default VPC (cost-saving for early stage) ───────────────────────────────
# For production, create a dedicated VPC with private subnets and NAT gateway.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# ─── Security Groups ─────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name_prefix = "${var.app_name}-${var.environment}-alb-"
  vpc_id      = data.aws_vpc.default.id
  description = "ALB - allows inbound HTTP/HTTPS from anywhere"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-alb-sg"
    Project     = var.app_name
    Environment = var.environment
  }
}

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.app_name}-${var.environment}-ecs-"
  vpc_id      = data.aws_vpc.default.id
  description = "ECS tasks - allows inbound from ALB only"

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound (MongoDB Atlas, Cognito, Stripe)"
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-ecs-sg"
    Project     = var.app_name
    Environment = var.environment
  }
}
