#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 🚀 ODISEA CLOUD — One-Click VPS Installer
# Designed for Ubuntu 22.04+
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║          🌌  ODISEA CLOUD INSTALLER  🌌              ║"
echo "║          Infrastructure Deployment Script             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run as root (sudo bash setup.sh)${NC}"
  exit 1
fi

# 2. Configuration Prompts
echo -e "${YELLOW}📋 Configuration${NC}"
echo "──────────────────────────────────────────"

detect_public_ip() {
  local detected_ip=""

  if command -v curl > /dev/null 2>&1; then
    detected_ip=$(curl -4 -fsS https://api.ipify.org 2>/dev/null || true)
  fi

  if [ -z "$detected_ip" ]; then
    detected_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi

  echo "$detected_ip"
}

prompt_with_default() {
  local prompt_text="$1"
  local default_value="$2"
  local result=""
  read -p "$prompt_text [$default_value]: " result
  echo "${result:-$default_value}"
}

DEFAULT_VPS_IP=$(detect_public_ip)
DEFAULT_API_PORT=3001
DEFAULT_WHM_PORT=3002
DEFAULT_ODIN_PORT=3003
DEFAULT_PG_PORT=5434
DEFAULT_PG_PASS=postgres

if [ -z "$DEFAULT_VPS_IP" ]; then
  echo -e "${YELLOW}⚠️  Could not auto-detect public IP. Please enter it manually.${NC}"
  read -p "Enter VPS Public IP: " DEFAULT_VPS_IP
fi

if [ -z "$DEFAULT_VPS_IP" ]; then
  echo -e "${RED}❌ VPS IP is required.${NC}"
  exit 1
fi

echo -e "${GREEN}🌐 Auto-detected VPS IP: ${DEFAULT_VPS_IP}${NC}"
echo -e "${CYAN}Tip:${NC} press Enter on each step to keep defaults (next/next mode)."

VPS_IP=$(prompt_with_default "VPS Public IP" "$DEFAULT_VPS_IP")
API_PORT=$(prompt_with_default "API Port" "$DEFAULT_API_PORT")
WHM_PORT=$(prompt_with_default "WHM Port" "$DEFAULT_WHM_PORT")
ODIN_PORT=$(prompt_with_default "ODIN Panel Port" "$DEFAULT_ODIN_PORT")
PG_PORT=$(prompt_with_default "PostgreSQL Port" "$DEFAULT_PG_PORT")
PG_PASS=$(prompt_with_default "PostgreSQL Password" "$DEFAULT_PG_PASS")

# Generate a random JWT secret (64 chars)
JWT_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}🔑 JWT Secret generated automatically${NC}"

echo ""
echo -e "${CYAN}Configuration Summary:${NC}"
echo "  VPS IP:     $VPS_IP"
echo "  API Port:   $API_PORT"
echo "  WHM Port:   $WHM_PORT"
echo "  ODIN Port:  $ODIN_PORT"
echo "  PG Port:    $PG_PORT"
echo ""
read -p "Continue? [Y/n]: " CONFIRM
CONFIRM=${CONFIRM:-Y}
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# 3. Firewall Setup
echo -e "\n${YELLOW}🛡️  Configuring Firewall (UFW)...${NC}"
apt install -y ufw > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw allow $API_PORT/tcp > /dev/null 2>&1
ufw allow $WHM_PORT/tcp > /dev/null 2>&1
ufw allow $ODIN_PORT/tcp > /dev/null 2>&1
echo "y" | ufw enable > /dev/null 2>&1
echo -e "${GREEN}✅ Firewall configured${NC}"

# 4. Install Dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"

# Remove potential Docker conflicts
apt purge -y containerd docker.io runc containerd.io 2>/dev/null || true
apt autoremove -y > /dev/null 2>&1

apt update -qq && apt install -y -qq curl git docker.io docker-compose > /dev/null 2>&1
echo -e "${GREEN}✅ Docker installed${NC}"

# Start Docker if not running
systemctl enable docker
systemctl start docker

# Install Node.js 20
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt install -y -qq nodejs > /dev/null 2>&1
fi
echo -e "${GREEN}✅ Node.js $(node -v) installed${NC}"

# Install PNPM & PM2
npm install -g pnpm@9 pm2 > /dev/null 2>&1
echo -e "${GREEN}✅ pnpm & PM2 installed${NC}"

# 5. Update docker-compose ports if non-default
echo -e "\n${YELLOW}🗄️  Starting Database Clusters...${NC}"

# Update docker-compose.yml with custom PG port
sed -i "s/\"5434:5432\"/\"${PG_PORT}:5432\"/" docker-compose.yml
sed -i "s/POSTGRES_PASSWORD: postgres/POSTGRES_PASSWORD: ${PG_PASS}/" docker-compose.yml

docker-compose down 2>/dev/null || true
docker-compose up -d
echo -e "${GREEN}✅ PostgreSQL (port $PG_PORT) & MySQL (port 3307) running${NC}"

# Wait for databases to be ready
echo -n "  Waiting for databases..."
sleep 5
for i in {1..12}; do
  if docker exec odisea-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e " ${GREEN}ready!${NC}"
    break
  fi
  echo -n "."
  sleep 3
done

# 6. Generate Environment Files
echo -e "\n${YELLOW}⚙️  Generating environment files...${NC}"

# API .env
cat <<EOT > apps/api/.env
NODE_ENV=production
PORT=$API_PORT
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://postgres:${PG_PASS}@127.0.0.1:${PG_PORT}/odisea_cloud
ODIN_PANEL_URL=http://$VPS_IP:$ODIN_PORT
IMPERSONATE_EXPIRES_IN=2h
EOT
echo -e "  ${GREEN}✅ apps/api/.env${NC}"

# WHM .env.local
cat <<EOT > apps/whm/.env.local
NEXT_PUBLIC_API_URL=http://$VPS_IP:$API_PORT/api/v1
PORT=$WHM_PORT
EOT
echo -e "  ${GREEN}✅ apps/whm/.env.local${NC}"

# ODIN Panel .env.local
cat <<EOT > apps/odin-panel/.env.local
NEXT_PUBLIC_API_URL=http://$VPS_IP:$API_PORT/api/v1
PORT=$ODIN_PORT
EOT
echo -e "  ${GREEN}✅ apps/odin-panel/.env.local${NC}"

# 7. Install & Build
echo -e "\n${YELLOW}🏗️  Installing dependencies & building...${NC}"
pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo -e "${YELLOW}  Building API...${NC}"
pnpm --filter @odisea/api build
echo -e "${GREEN}  ✅ API built${NC}"

echo -e "${YELLOW}  Building WHM...${NC}"
pnpm --filter @odisea/whm build
echo -e "${GREEN}  ✅ WHM built${NC}"

echo -e "${YELLOW}  Building ODIN Panel...${NC}"
pnpm --filter @odisea/odin-panel build
echo -e "${GREEN}  ✅ ODIN Panel built${NC}"

# 8. Launch with PM2
echo -e "\n${YELLOW}🛰️  Launching services with PM2...${NC}"

# Cleanup old processes
pm2 delete odisea-api odisea-whm odisea-odin 2>/dev/null || true
# Start API (compiled JS)
pm2 start apps/api/dist/server.js --name odisea-api --env production
echo -e "  ${GREEN}✅ odisea-api started on :$API_PORT${NC}"

# Start WHM (Next.js)
pm2 start "npx next start apps/whm -p $WHM_PORT" --name odisea-whm
echo -e "  ${GREEN}✅ odisea-whm started on :$WHM_PORT${NC}"

# Start ODIN Panel (Next.js)
pm2 start "npx next start apps/odin-panel -p $ODIN_PORT" --name odisea-odin
echo -e "  ${GREEN}✅ odisea-odin started on :$ODIN_PORT${NC}"

pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 9. Health Check
echo -e "\n${YELLOW}🔍 Running health checks...${NC}"
sleep 3

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$API_PORT/health 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
  echo -e "  ${GREEN}✅ API health: OK (200)${NC}"
else
  echo -e "  ${RED}⚠️  API health: $API_STATUS (may still be starting)${NC}"
fi

# 10. Summary
echo -e "\n${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║       ✅  ODISEA CLOUD — Installation Complete       ║"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║                                                       ║"
echo "║  🌐 WHM Dashboard:  http://$VPS_IP:$WHM_PORT"
echo "║  👤 ODIN Panel:     http://$VPS_IP:$ODIN_PORT"
echo "║  🔌 API Service:    http://$VPS_IP:$API_PORT"
echo "║  💚 API Health:     http://$VPS_IP:$API_PORT/health"
echo "║                                                       ║"
echo "║  📋 PM2 Status:     pm2 status                       ║"
echo "║  📋 PM2 Logs:       pm2 logs                         ║"
echo "║  🔄 Restart All:    pm2 restart all                  ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "  1. Configure Nginx reverse proxy for domains (optional)"
echo "  2. Setup SSL with certbot (optional)"
echo "  3. Test: curl http://$VPS_IP:$API_PORT/health"
echo ""
