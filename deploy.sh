#!/usr/bin/env bash
set -euo pipefail

# Deploy-pipeline for Hostrup Hub.
# Kvalitetsporten kører FØR git push, så et fejlende build aldrig efterlader
# en ødelagt commit på origin. Se AGENTS.md § Deployment.

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

CONTAINER="wishbuy"
COMPOSE_FILE="/hostrup/docker/docker-compose.yml"
ENV_FILE="/hostrup/docker/.env"
HEALTH_URL="http://10.0.0.2:3005/dashboard/finance"
AUTH_HEADER_NAME="Remote-User"
# hooks.server.ts upserter brugeren fra headeren. Brug derfor et EKSISTERENDE
# brugernavn, så health-checket bliver en no-op update og ikke sår spøgelses-
# brugere i User-tabellen ved hver udrulning.
AUTH_HEADER_VALUE="${DEPLOY_HEALTH_USER:-ronni}"

cd "$(dirname "$0")"

step() { echo -e "\n${BLUE}[$1/8] $2${NC}"; }
ok() { echo -e "${GREEN}✓ $1${NC}"; }
fail() {
	echo -e "${RED}✗ $1${NC}"
	exit 1
}

MSG="${1:-Auto-deploy via AI agent}"

# Registreres før commit, så vi ved om schemaet skal pushes til databasen bagefter
SCHEMA_CHANGED=false
if ! git diff --quiet HEAD -- prisma/schema.prisma; then
	SCHEMA_CHANGED=true
fi

# ── Kvalitetsport ────────────────────────────────────────────────────────────

step 1 "Genererer Prisma Client..."
npx prisma generate >/dev/null || fail "Prisma generate fejlede."
ok "Prisma Client er i sync med schemaet."

step 2 "Kører lint (Prettier + ESLint)..."
npm run lint || fail "Lint fejlede. Kør 'npm run format' og prøv igen."
ok "Ingen lint-fejl."

step 3 "Kører typetjek (svelte-check)..."
npm run check || fail "svelte-check fejlede."
ok "0 fejl, 0 advarsler."

step 4 "Kører tests (Vitest)..."
npm test || fail "Tests fejlede."
ok "Alle tests grønne."

step 5 "Verificerer produktionsbuild..."
npm run build >/dev/null || fail "Build fejlede."
ok "Build gennemført."

# ── Git ──────────────────────────────────────────────────────────────────────

step 6 "Committer og pusher..."
git add -A
if git diff-index --quiet HEAD --; then
	echo "Ingen lokale ændringer at committe."
	git push || true
else
	git commit -m "$MSG"
	git push
fi
ok "Kildekoden er synkroniseret."

# ── Docker ───────────────────────────────────────────────────────────────────

step 7 "Genbygger container..."
DEPLOY_START=$(date -u +%Y-%m-%dT%H:%M:%S)
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build "$CONTAINER" ||
	fail "Docker-build fejlede."

if [ "$SCHEMA_CHANGED" = true ]; then
	echo -e "${YELLOW}Schema-ændring registreret — synkroniserer databasen...${NC}"
	# DATABASE_URL peger på Docker-hostnavnet 'postgresql', som kun kan slås op
	# inde i netværket. Derfor kører push'et i containeren, ikke på hosten.
	docker exec "$CONTAINER" npx prisma db push || fail "Prisma db push fejlede."
	ok "Databaseschema synkroniseret."
else
	echo "Ingen schema-ændringer — springer db push over."
fi

# ── Runtime-verifikation ─────────────────────────────────────────────────────

step 8 "Verificerer runtime..."
docker ps --filter "name=^/${CONTAINER}$" --format '{{.Names}}' | grep -q "$CONTAINER" ||
	fail "Containeren kører ikke."

HTTP_CODE=""
for _ in $(seq 1 15); do
	HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
		-H "${AUTH_HEADER_NAME}: ${AUTH_HEADER_VALUE}" "$HEALTH_URL" || echo "000")
	[ "$HTTP_CODE" = "200" ] && break
	sleep 2
done
[ "$HTTP_CODE" = "200" ] || fail "Health-check gav HTTP $HTTP_CODE (forventede 200)."
ok "Appen svarer HTTP 200."

ERRORS=$(docker logs "$CONTAINER" --since "$DEPLOY_START" 2>&1 |
	grep -iE 'error|exception|unhandled|ECONNREFUSED' |
	grep -viE 'yahoo-finance-api-feedback|suppressNotices' || true)
if [ -n "$ERRORS" ]; then
	echo -e "${YELLOW}⚠ Fejl i containerloggen efter udrulning:${NC}"
	echo "$ERRORS"
	fail "Udrulningen er live, men loggen er ikke ren — undersøg ovenstående."
fi
ok "Containerloggen er ren."

echo -e "\n${GREEN}✓ Deployment gennemført: $MSG${NC}"
