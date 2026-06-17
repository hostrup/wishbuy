#!/usr/bin/env bash
# =============================================================================
# deploy.sh — wishbuy deploy-script
# =============================================================================
set -euo pipefail

PROJECT_DIR="/hostrup/docker/config/wishbuy"
COMPOSE_FILE="/hostrup/docker/docker-compose.yml"
ENV_FILE="/hostrup/docker/.env"
COMPOSE_CMD="docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE}"
SERVICE_NAME="wishbuy"
CONTAINER_NAME="wishbuy"

echo "=== Deploying wishbuy ==="
cd "$PROJECT_DIR"

# Generer Prisma klient lokalt
echo "Generating Prisma client..."
npx prisma generate

# Indlæs eventuelle database-migrationer
echo "Checking/Running Prisma migrations..."
if [ -f .env ]; then
    # Indlæs midlertidigt .env variabler
    export $(grep -v '^#' .env | xargs)
fi

LOCAL_DB_URL=$(echo "${DATABASE_URL:-}" | sed 's/@postgresql:/@127.0.0.1:/')
if [ -n "$LOCAL_DB_URL" ]; then
    echo "Running Prisma db push using local DB URL..."
    DATABASE_URL="$LOCAL_DB_URL" npx prisma db push --accept-data-loss
else
    echo "DATABASE_URL ikke fundet i .env, springer db push over."
fi

# Rebuild og genstart containeren via docker compose
echo "Rebuilding and restarting docker container..."
sudo $COMPOSE_CMD up -d --build --no-deps "$SERVICE_NAME"

echo "Waiting for container to start..."
sleep 5

if docker ps --format '{{.Names}} {{.Status}}' | grep "$CONTAINER_NAME" | grep -q "Up"; then
    echo "=== Deployment successful ==="
else
    echo "=== Deployment failed: Container is not running! ==="
    docker logs --tail 20 "$CONTAINER_NAME"
    exit 1
fi
