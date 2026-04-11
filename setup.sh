#!/bin/bash

# Odisea Cloud One-Click Installer
# Designed for Ubuntu 22.04+

set -e

echo "🚀 Starting Odisea Cloud Infrastructure Installation..."

# 1. Check Root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root"
  exit
fi

# 2. Ask for Configuration
read -p "Enter API Port [Default: 3212]: " API_PORT
API_PORT=${API_PORT:-3212}

read -p "Enter WHM Port [Default: 3213]: " WHM_PORT
WHM_PORT=${WHM_PORT:-3213}

read -p "Enter ODIN Panel Port [Default: 3214]: " ODIN_PORT
ODIN_PORT=${ODIN_PORT:-3214}

read -p "Enter VPS Public IP: " VPS_IP

# 3. Firewall Security
echo "🛡️  Configuring Firewall (UFW)..."
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow $API_PORT/tcp
ufw allow $WHM_PORT/tcp
ufw allow $ODIN_PORT/tcp
ufw allow 53/udp
ufw allow 53/tcp
echo "y" | ufw enable

# 4. Install Dependencies
echo "📦 Cleaning up conflicts and installing dependencies..."
# Remove potential conflicts
apt purge -y containerd docker.io runc containerd.io || true
apt autoremove -y

apt update && apt install -y curl git docker.io docker-compose

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PNPM & PM2
npm install -g pnpm pm2

# 5. Database Setup
echo "🗄️  Starting Database Clusters (Postgres & MySQL)..."
docker-compose up -d

# 6. Environment Configuration
echo "⚙️  Generating Environment Files..."

# API Config
cat <<EOT > apps/api/.env
PORT=$API_PORT
DB_URL=postgresql://postgres:postgres@localhost:5434/odisea_cloud
MYSQL_HOST=localhost
MYSQL_PORT=3307
MYSQL_USER=root
MYSQL_PASS=root
EOT

# WHM Config
cat <<EOT > apps/whm/.env.local
NEXT_PUBLIC_API_URL=http://$VPS_IP:$API_PORT/api/v1
PORT=$WHM_PORT
EOT

# ODIN Config
cat <<EOT > apps/odin-panel/.env.local
NEXT_PUBLIC_API_URL=http://$VPS_IP:$API_PORT/api/v1
PORT=$ODIN_PORT
EOT

# 7. Build and Launch
echo "🏗️  Building Odisea Cloud Ecosystem..."
pnpm install
pnpm build

# 8. Launching Services with PM2
echo "🛰️  Launching Services with PM2..."
pm2 delete nexhost-api nexhost-whm nexhost-odin || true
pm2 start apps/api/dist/index.js --name odisea-api
pm2 start "pnpm --filter whm start -- -p $WHM_PORT" --name odisea-whm
pm2 start "pnpm --filter odin-panel start -- -p $ODIN_PORT" --name odisea-odin

pm2 save

echo "✅ Installation Complete! Welcome to Odisea Cloud"
echo "--------------------------------------------------"
echo "WHM: http://$VPS_IP:$WHM_PORT"
echo "ODIN: http://$VPS_IP:$ODIN_PORT"
echo "API: http://$VPS_IP:$API_PORT"
echo "--------------------------------------------------"
