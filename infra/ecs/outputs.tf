output "alb_dns_name" {
  description = "ALB public DNS name"
  value       = aws_lb.app.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for docker push"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.app.name
}

output "nextauth_url" {
  description = "NEXTAUTH_URL — use for Cognito callback URL"
  value       = var.domain_name != "" ? "https://staging.${var.domain_name}" : "http://${aws_lb.app.dns_name}"
}

output "github_actions_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN secret in GitHub repository"
  value       = aws_iam_role.github_actions.arn
}

output "route53_nameservers" {
  description = "Set these as nameservers at GoDaddy registrar"
  value       = var.domain_name != "" ? aws_route53_zone.app[0].name_servers : []
}
