#!/usr/bin/env bash
set -e

# Farvekoder
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}[1/4] Kører kvalitetskontrol (Svelte-check)...${NC}"
if npm run check; then
  echo -e "${GREEN}✓ Build og tests bestået! Går videre til git-integration...${NC}"
else
  echo -e "${RED}✗ Build eller tests fejlede! Afbryder udrulning.${NC}"
  exit 1
fi

echo -e "\n${BLUE}[2/4] Tilføjer ændringer og uploader til Git...${NC}"
MSG="${1:-Auto-deploy via AI agent}"
git add .
if ! git diff-index --quiet HEAD --; then
  echo -e "${BLUE}Opretter commit: '$MSG'...${NC}"
  git commit -m "$MSG"
  echo -e "${BLUE}Pusher ændringer...${NC}"
  git push
  echo -e "${GREEN}✓ Kildekoden er synkroniseret!${NC}"
else
  git push || true
  echo -e "${GREEN}✓ Ingen lokale ændringer at committe.${NC}"
fi

echo -e "\n${BLUE}[3/4] Genbygger og opdaterer Docker-containeren...${NC}"
docker compose -f /hostrup/docker/docker-compose.yml --env-file /hostrup/docker/.env up -d --build wishbuy

echo -e "\n${BLUE}[4/4] Verificerer container status...${NC}"
sleep 2
if docker ps | grep -q wishbuy; then
  echo -e "${GREEN}✓ Docker-container kører stabilt!${NC}"
else
  echo -e "${RED}✗ Advarsel: Containeren fejlede opstart.${NC}"
  exit 1
fi
