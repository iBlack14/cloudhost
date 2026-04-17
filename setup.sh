#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 🚀 ODISEA CLOUD — One-Click VPS Installer
# Designed for Ubuntu 22.04+
# ═══════════════════════════════════════════════════════════════

set -Eeuo pipefail

on_error() {
  local line_no="$1"
  echo -e "\n${RED}❌ Setup failed on line ${line_no}.${NC}"
  echo -e "${YELLOW}Check logs above and run again.${NC}"
}
trap 'on_error $LINENO' ERR

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

is_valid_port() {
  [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

is_valid_username() {
  [[ "$1" =~ ^[a-zA-Z0-9_.-]{3,32}$ ]]
}

is_valid_password() {
  [ "${#1}" -ge 8 ]
}

is_valid_email() {
  [[ "$1" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]
}

assert_distinct_ports() {
  if [ "$API_PORT" = "$WHM_PORT" ] || [ "$API_PORT" = "$ODIN_PORT" ] || [ "$WHM_PORT" = "$ODIN_PORT" ]; then
    echo -e "${RED}❌ API/WHM/ODIN ports must be different.${NC}"
    exit 1
  fi
}

resolve_compose_cmd() {
  if docker compose version > /dev/null 2>&1; then
    echo "docker compose"
    return
  fi

  if command -v docker-compose > /dev/null 2>&1; then
    echo "docker-compose"
    return
  fi

  echo -e "${RED}❌ docker compose not found.${NC}"
  exit 1
}

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

# 2. Configuration
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
AUTO_MODE="${AUTO_MODE:-1}"

if [ -z "${VPS_IP:-}" ] && [ -z "$DEFAULT_VPS_IP" ]; then
  echo -e "${YELLOW}⚠️  Could not auto-detect public IP. Please enter it manually.${NC}"
  if [ "$AUTO_MODE" = "1" ]; then
    echo -e "${RED}❌ AUTO_MODE is enabled and VPS_IP could not be detected.${NC}"
    echo -e "${YELLOW}Set VPS_IP manually: VPS_IP=<YOUR_IP> bash setup.sh${NC}"
    exit 1
  fi
  read -p "Enter VPS Public IP: " DEFAULT_VPS_IP
fi

if [ -z "${VPS_IP:-}" ] && [ -z "$DEFAULT_VPS_IP" ]; then
  echo -e "${RED}❌ VPS IP is required.${NC}"
  exit 1
fi

VPS_IP="${VPS_IP:-$DEFAULT_VPS_IP}"
API_PORT="${API_PORT:-$DEFAULT_API_PORT}"
WHM_PORT="${WHM_PORT:-$DEFAULT_WHM_PORT}"
ODIN_PORT="${ODIN_PORT:-$DEFAULT_ODIN_PORT}"
PG_PORT="${PG_PORT:-$DEFAULT_PG_PORT}"

echo -e "${GREEN}🌐 Selected VPS IP: ${VPS_IP}${NC}"
echo -e "${CYAN}Tip:${NC} By default everything runs automatic. You only choose ports if needed."
if [ "$AUTO_MODE" != "1" ]; then
  read -p "Customize ports? [y/N]: " CUSTOM_PORTS
  CUSTOM_PORTS=${CUSTOM_PORTS:-N}

  if [[ "$CUSTOM_PORTS" =~ ^[Yy]$ ]]; then
    while true; do
      API_PORT=$(prompt_with_default "API Port" "$DEFAULT_API_PORT")
      WHM_PORT=$(prompt_with_default "WHM Port" "$DEFAULT_WHM_PORT")
      ODIN_PORT=$(prompt_with_default "ODIN Panel Port" "$DEFAULT_ODIN_PORT")
      PG_PORT=$(prompt_with_default "PostgreSQL Port" "$DEFAULT_PG_PORT")

      if ! is_valid_port "$API_PORT" || ! is_valid_port "$WHM_PORT" || ! is_valid_port "$ODIN_PORT" || ! is_valid_port "$PG_PORT"; then
        echo -e "${YELLOW}⚠️  Invalid port detected. Use values between 1 and 65535.${NC}"
        continue
      fi

      assert_distinct_ports
      break
    done
  fi
fi

if ! is_valid_port "$API_PORT" || ! is_valid_port "$WHM_PORT" || ! is_valid_port "$ODIN_PORT" || ! is_valid_port "$PG_PORT"; then
  echo -e "${RED}❌ One or more ports are invalid.${NC}"
  exit 1
fi

assert_distinct_ports

# Generate random passwords
PG_PASS=$(openssl rand -hex 12)
MYSQL_ROOT_PASS=$(openssl rand -hex 12)

# Generate a random JWT secret (64 chars)
JWT_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}🔑 Database & JWT secrets generated automatically${NC}"

# Initial admin credentials
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-${ADMIN_USER}@odisea.local}"
ADMIN_PASS_GENERATED=0

if [ "$AUTO_MODE" = "1" ]; then
  if [ -z "$ADMIN_PASS" ]; then
    ADMIN_PASS=$(openssl rand -base64 18 | tr -d '=+/' | cut -c1-16)
    ADMIN_PASS_GENERATED=1
  fi
else
  ADMIN_USER=$(prompt_with_default "WHM admin username" "$ADMIN_USER")
  if [ -z "$ADMIN_PASS" ]; then
    read -rsp "WHM admin password (min 8 chars): " ADMIN_PASS
    echo ""
  fi
  read -rp "WHM admin email [${ADMIN_EMAIL}]: " _admin_email_input
  ADMIN_EMAIL="${_admin_email_input:-$ADMIN_EMAIL}"
fi

if ! is_valid_username "$ADMIN_USER"; then
  echo -e "${RED}❌ Invalid ADMIN_USER. Use 3-32 chars: letters, numbers, ., _, -${NC}"
  exit 1
fi

if ! is_valid_password "$ADMIN_PASS"; then
  echo -e "${RED}❌ Invalid ADMIN_PASS. Minimum 8 characters.${NC}"
  exit 1
fi

if ! is_valid_email "$ADMIN_EMAIL"; then
  echo -e "${RED}❌ Invalid ADMIN_EMAIL.${NC}"
  exit 1
fi

echo ""
echo -e "${CYAN}Configuration Summary:${NC}"
echo "  VPS IP:     $VPS_IP"
echo "  API Port:   $API_PORT"
echo "  WHM Port:   $WHM_PORT"
echo "  ODIN Port:  $ODIN_PORT"
echo "  PG Port:    $PG_PORT"
echo "  PG Pass:    [auto-generated]"
echo "  Admin User: $ADMIN_USER"
if [ "$ADMIN_PASS_GENERATED" = "1" ]; then
  echo "  Admin Pass: [auto-generated]"
else
  echo "  Admin Pass: [provided]"
fi
echo ""
if [ "$AUTO_MODE" != "1" ]; then
  read -p "Continue? [Y/n]: " CONFIRM
  CONFIRM=${CONFIRM:-Y}
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
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
ufw --force enable > /dev/null 2>&1
echo -e "${GREEN}✅ Firewall configured${NC}"

# 4. Install Dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
apt update -qq
apt install -y -qq curl git ca-certificates > /dev/null 2>&1

if ! command -v docker > /dev/null 2>&1; then
  apt install -y -qq docker.io docker-compose-plugin > /dev/null 2>&1
fi
echo -e "${GREEN}✅ Docker dependencies ready${NC}"

# Start Docker if installed but not running
if systemctl list-unit-files | grep -q "^docker.service"; then
  systemctl enable docker > /dev/null 2>&1 || true
  systemctl start docker > /dev/null 2>&1 || true
fi

# Install Node.js 20
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt install -y -qq nodejs > /dev/null 2>&1
fi
echo -e "${GREEN}✅ Node.js $(node -v) installed${NC}"

# Install PNPM, PM2 & Certbot
npm install -g pnpm@9 pm2 > /dev/null 2>&1
apt install -y -qq nginx certbot python3-certbot-nginx > /dev/null 2>&1
echo -e "${GREEN}✅ pnpm, PM2, Nginx & Certbot installed${NC}"

# 5. Update docker-compose ports if non-default
echo -e "\n${YELLOW}🗄️  Starting Database Clusters...${NC}"

# Keep base compose untouched; write override for this host
cat <<EOT > docker-compose.override.yml
services:
  postgres:
    ports:
      - "${PG_PORT}:5432"
    environment:
      POSTGRES_PASSWORD: ${PG_PASS}
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASS}
EOT

COMPOSE_CMD=$(resolve_compose_cmd)
$COMPOSE_CMD down > /dev/null 2>&1 || true
$COMPOSE_CMD up -d
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

# Ensure initial WHM admin account exists
echo -e "\n${YELLOW}👤 Provisioning initial WHM admin user...${NC}"
ADMIN_HASH=$(node -e "const { randomBytes, scryptSync } = require('crypto'); const p = process.argv[1]; const s = randomBytes(16).toString('hex'); const d = scryptSync(p, s, 64).toString('hex'); process.stdout.write(s + ':' + d);" "$ADMIN_PASS")
ADMIN_EXISTS=$(docker exec odisea-postgres psql -U postgres -d odisea_cloud -tAc "SELECT 1 FROM users WHERE username='${ADMIN_USER}' LIMIT 1;" | tr -d '[:space:]')
if [ "$ADMIN_EXISTS" = "1" ]; then
  echo -e "  ${GREEN}✅ Admin '${ADMIN_USER}' already exists${NC}"
else
  docker exec odisea-postgres psql -U postgres -d odisea_cloud -c "INSERT INTO users (username, email, password_hash, role, status) VALUES ('${ADMIN_USER}', '${ADMIN_EMAIL}', '${ADMIN_HASH}', 'admin', 'active');" > /dev/null
  echo -e "  ${GREEN}✅ Admin '${ADMIN_USER}' created${NC}"
fi

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
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASS}
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
# Start API (compiled JS) with app cwd so dotenv reads apps/api/.env
pm2 start dist/server.js --name odisea-api --cwd apps/api --env production
echo -e "  ${GREEN}✅ odisea-api started on :$API_PORT${NC}"

# Start WHM (Next.js - workspace local version)
pm2 start "pnpm --filter @odisea/whm exec next start -p $WHM_PORT" --name odisea-whm
echo -e "  ${GREEN}✅ odisea-whm started on :$WHM_PORT${NC}"

# Start ODIN Panel (Next.js - workspace local version)
pm2 start "pnpm --filter @odisea/odin-panel exec next start -p $ODIN_PORT" --name odisea-odin
echo -e "  ${GREEN}✅ odisea-odin started on :$ODIN_PORT${NC}"

pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 9. Health Check
echo -e "\n${YELLOW}🔍 Running health checks...${NC}"
sleep 3

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$API_PORT/health 2>/dev/null || echo "000")
WHM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$WHM_PORT 2>/dev/null || echo "000")
ODIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$ODIN_PORT 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
  echo -e "  ${GREEN}✅ API health: OK (200)${NC}"
else
  echo -e "  ${RED}⚠️  API health: $API_STATUS (may still be starting)${NC}"
fi
if [ "$WHM_STATUS" = "200" ]; then
  echo -e "  ${GREEN}✅ WHM health: OK (200)${NC}"
else
  echo -e "  ${YELLOW}⚠️  WHM health: $WHM_STATUS${NC}"
fi
if [ "$ODIN_STATUS" = "200" ]; then
  echo -e "  ${GREEN}✅ ODIN health: OK (200)${NC}"
else
  echo -e "  ${YELLOW}⚠️  ODIN health: $ODIN_STATUS${NC}"
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
echo "║  🔐 WHM User:       $ADMIN_USER"
echo "║  🔐 WHM Pass:       $ADMIN_PASS"
echo "║  ✅ WHM Health:     http://$VPS_IP:$WHM_PORT"
echo "║  ✅ ODIN Health:    http://$VPS_IP:$ODIN_PORT"
echo "║                                                       ║"
echo "║  📋 PM2 Status:     pm2 status                       ║"
echo "║  📋 PM2 Logs:       pm2 logs                         ║"
echo "║  🔄 Restart All:    pm2 restart all                  ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "  1. Use 'certbot --nginx' to enable SSL on your domains."
echo "  2. Professional SSL management script available at: infra/scripts/provision-ssl.sh"
echo "  3. Config templates in: infra/nginx/"
echo "  4. Test: curl http://$VPS_IP:$API_PORT/health"
echo ""
