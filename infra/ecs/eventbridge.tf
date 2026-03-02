# ─── EventBridge Rules (Cron Replacement) ─────────────────────────────────────
# Replaces Cloudflare Cron Triggers. Uses EventBridge → Lambda → HTTP call.

# Lambda execution role
resource "aws_iam_role" "cron_lambda" {
  name = "${var.app_name}-${var.environment}-cron-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cron_lambda_logs" {
  role       = aws_iam_role.cron_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "cron_lambda_ssm" {
  name = "ssm-read-cron-secret"
  role = aws_iam_role.cron_lambda.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameter"]
      Resource = aws_ssm_parameter.cron_secret.arn
    }]
  })
}

# Lambda source code
data "archive_file" "cron_lambda" {
  type        = "zip"
  output_path = "${path.module}/lambda/cron-caller.zip"

  source {
    content  = <<-EOF
      const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
      const ssm = new SSMClient({ region: '${data.aws_region.current.name}' });
      let cachedSecret = null;

      async function getSecret() {
        if (cachedSecret) return cachedSecret;
        const res = await ssm.send(new GetParameterCommand({
          Name: process.env.CRON_SECRET_SSM,
          WithDecryption: true,
        }));
        cachedSecret = res.Parameter.Value;
        return cachedSecret;
      }

      exports.handler = async (event) => {
        const endpoint = event.endpoint;
        if (!endpoint) throw new Error('Missing endpoint in event');
        const secret = await getSecret();
        const url = process.env.APP_URL + endpoint;
        const res = await fetch(url, {
          headers: { 'Authorization': 'Bearer ' + secret },
        });
        const body = await res.text();
        console.log(JSON.stringify({ endpoint, status: res.status, body: body.slice(0, 500) }));
        return { statusCode: res.status, body };
      };
    EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "cron_caller" {
  function_name = "${var.app_name}-${var.environment}-cron-caller"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.cron_lambda.arn
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.cron_lambda.output_path
  source_code_hash = data.archive_file.cron_lambda.output_base64sha256

  environment {
    variables = {
      APP_URL         = var.domain_name != "" ? "https://staging.${var.domain_name}" : "http://${aws_lb.app.dns_name}"
      CRON_SECRET_SSM = aws_ssm_parameter.cron_secret.name
    }
  }

  tags = {
    Project     = var.app_name
    Environment = var.environment
  }
}

# ─── Timeout recovery — every minute ─────────────────────────────────────────

resource "aws_cloudwatch_event_rule" "timeout_recovery" {
  name                = "${var.app_name}-${var.environment}-timeout-recovery"
  description         = "Trigger timeout recovery every minute"
  schedule_expression = "rate(1 minute)"
  tags                = { Project = var.app_name, Environment = var.environment }
}

resource "aws_cloudwatch_event_target" "timeout_recovery" {
  rule  = aws_cloudwatch_event_rule.timeout_recovery.name
  arn   = aws_lambda_function.cron_caller.arn
  input = jsonencode({ endpoint = "/api/cron/timeout-recovery" })
}

resource "aws_lambda_permission" "timeout_recovery" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_caller.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.timeout_recovery.arn
}

# ─── Unfreeze earnings — every hour ──────────────────────────────────────────

resource "aws_cloudwatch_event_rule" "unfreeze_earnings" {
  name                = "${var.app_name}-${var.environment}-unfreeze-earnings"
  description         = "Trigger unfreeze earnings every hour"
  schedule_expression = "rate(1 hour)"
  tags                = { Project = var.app_name, Environment = var.environment }
}

resource "aws_cloudwatch_event_target" "unfreeze_earnings" {
  rule  = aws_cloudwatch_event_rule.unfreeze_earnings.name
  arn   = aws_lambda_function.cron_caller.arn
  input = jsonencode({ endpoint = "/api/cron/unfreeze-earnings" })
}

resource "aws_lambda_permission" "unfreeze_earnings" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_caller.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.unfreeze_earnings.arn
}

# ─── Benchmark injection — every 5 minutes ───────────────────────────────────

resource "aws_cloudwatch_event_rule" "benchmark_inject" {
  name                = "${var.app_name}-${var.environment}-benchmark-inject"
  description         = "Trigger benchmark injection every 5 minutes"
  schedule_expression = "rate(5 minutes)"
  tags                = { Project = var.app_name, Environment = var.environment }
}

resource "aws_cloudwatch_event_target" "benchmark_inject" {
  rule  = aws_cloudwatch_event_rule.benchmark_inject.name
  arn   = aws_lambda_function.cron_caller.arn
  input = jsonencode({ endpoint = "/api/cron/benchmark-inject" })
}

resource "aws_lambda_permission" "benchmark_inject" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_caller.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.benchmark_inject.arn
}
