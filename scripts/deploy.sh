#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build amd64 Docker image, push to ECR, deploy to ECS Fargate.
#
# Usage:   ./scripts/deploy.sh
# Prereqs: AWS CLI configured (profile: openclaw-jobs), Docker Desktop running
# Time:    ~2 minutes
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
AWS_PROFILE="openclaw-jobs"
AWS_REGION="ap-southeast-1"
ECR_REPO="openclaw-jobs-staging"
ECS_CLUSTER="openclaw-jobs-staging"
ECS_SERVICE="openclaw-jobs-staging"
ACCOUNT_ID="766642929316"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

export AWS_PROFILE AWS_REGION

# ── Resolve image tag from git ────────────────────────────────────────────────
COMMIT_SHA=$(git rev-parse --short HEAD)
IMAGE_TAG="${ECR_URI}:${COMMIT_SHA}"
IMAGE_LATEST="${ECR_URI}:latest"

echo "╔══════════════════════════════════════════════════╗"
echo "║  OpenClaw Deploy → ${COMMIT_SHA}                      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Step 1: ECR Login ─────────────────────────────────────────────────────────
echo "→ [1/4] Logging in to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin \
    "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com" \
    > /dev/null 2>&1
echo "  ✓ ECR login OK"

# ── Step 2: Build + Push (amd64, via buildx) ─────────────────────────────────
echo "→ [2/4] Building linux/amd64 image & pushing to ECR..."
docker --context=desktop-linux buildx build \
  --platform linux/amd64 \
  --build-arg BUILD_VERSION="${COMMIT_SHA}" \
  --tag "${IMAGE_TAG}" \
  --tag "${IMAGE_LATEST}" \
  --push \
  --quiet \
  .
echo "  ✓ Image pushed: ${IMAGE_TAG}"

# ── Step 3: Register new ECS task definition ──────────────────────────────────
echo "→ [3/4] Updating ECS task definition..."

# Get current task definition
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --query 'services[0].taskDefinition' \
  --output text)

aws ecs describe-task-definition \
  --task-definition "${CURRENT_TASK_DEF}" \
  --query 'taskDefinition' > /tmp/oc-task-def.json

# Swap image, strip read-only fields, register
jq --arg IMG "${IMAGE_TAG}" \
  '.containerDefinitions[0].image = $IMG |
   del(.taskDefinitionArn, .revision, .status,
       .requiresAttributes, .compatibilities,
       .registeredAt, .registeredBy)' \
  /tmp/oc-task-def.json > /tmp/oc-new-task-def.json

NEW_TASK_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/oc-new-task-def.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "  ✓ Registered: ${NEW_TASK_ARN##*/}"

# ── Step 4: Deploy & wait ─────────────────────────────────────────────────────
echo "→ [4/4] Deploying to ECS (rolling update)..."
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --task-definition "${NEW_TASK_ARN}" \
  --force-new-deployment \
  > /dev/null

echo "  Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}"

# ── Verify ────────────────────────────────────────────────────────────────────
echo ""
HEALTH=$(curl -sk "https://openclaw-jobs-staging-964043820.ap-southeast-1.elb.amazonaws.com/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
VERSION=$(echo "${HEALTH}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null || echo "?")

echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Deploy complete!                             ║"
echo "║  Commit:  ${COMMIT_SHA}                               ║"
echo "║  Version: ${VERSION}                               "
echo "╚══════════════════════════════════════════════════╝"

rm -f /tmp/oc-task-def.json /tmp/oc-new-task-def.json
