#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 🧹 ODISEA CLOUD — Cleanup & Reset Script
# This will completely remove Docker volumes, PM2, Nginx configs,
# and build/env artifacts to allow a clean reinstall.
# ═══════════════════════════════════════════════════════════════

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "⚠️  WARNING: This will completely destroy all data on the VPS!"
echo "   - Removes all Docker containers, volumes, and databases (PostgreSQL & MySQL)."
echo "   - Deletes all PM2 processes (odisea-api, odisea-whm, odisea-odin, odisea-webmail)."
echo "   - Deletes Nginx configuration for Odisea subdomains."
echo "   - Cleans up local builds and generated .env files."
echo -e "${NC}"

read -p "¿Estás seguro de que deseas eliminar todo y restablecer el VPS? [y/N]: " CONFIRM
CONFIRM=$(echo "${CONFIRM:-N}" | tr -d '\r' | tr -d ' ')

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Operación cancelada."
    exit 0
fi

echo -e "\n${YELLOW}🛑 Stopping and deleting PM2 processes...${NC}"
pm2 delete all 2>/dev/null || true
pm2 save --force 2>/dev/null || true
pm2 kill 2>/dev/null || true
echo -e "${GREEN}✅ PM2 cleaned up${NC}"

echo -e "\n${YELLOW}🐳 Stopping and removing Docker containers, networks, and volumes...${NC}"
if command -v docker-compose > /dev/null 2>&1; then
    docker-compose down -v --remove-orphans 2>/dev/null || true
elif docker compose version > /dev/null 2>&1; then
    docker compose down -v --remove-orphans 2>/dev/null || true
fi

# Clean remaining volumes or containers just in case
docker rm -f odisea-postgres odisea-mysql odisea-pma 2>/dev/null || true
docker volume rm -f cloudhost_postgres_data cloudhost_mysql_data 2>/dev/null || true
echo -e "${GREEN}✅ Docker containers and volumes removed${NC}"

echo -e "\n${YELLOW}🌐 Deleting Nginx configurations...${NC}"
rm -f /etc/nginx/sites-enabled/odisea
rm -f /etc/nginx/sites-available/odisea
systemctl restart nginx || true
echo -e "${GREEN}✅ Nginx configurations deleted${NC}"

echo -e "\n${YELLOW}⚙️  Removing local environment files...${NC}"
rm -f docker-compose.override.yml
rm -f apps/api/.env
rm -f apps/whm/.env.local
rm -f apps/odin-panel/.env.local
rm -f apps/webmail/.env.local
echo -e "${GREEN}✅ Environment configurations removed${NC}"

echo -e "\n${YELLOW}🧹 Cleaning up build artifacts and node_modules...${NC}"
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm -rf apps/*/dist apps/*/.next packages/*/.next apps/*/.turbo packages/*/.turbo apps/*/.turbo
pnpm store prune 2>/dev/null || true
echo -e "${GREEN}✅ Build files and dependencies cleaned${NC}"

echo -e "\n${GREEN}✨ VPS RESET COMPLETE! You can now run 'bash setup.sh' to start fresh. ✨${NC}\n"
