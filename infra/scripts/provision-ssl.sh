#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🔐 ODISEA SSL PROVISIONER — Automated SSL for Client Domains
# ═══════════════════════════════════════════════════════════════

set -e

DOMAIN=$1
PORT=$2

if [ -z "$DOMAIN" ] || [ -z "$PORT" ]; then
    echo "Usage: ./provision-ssl.sh <domain> <internal_port>"
    exit 1
fi

echo "🚀 Provisioning SSL for $DOMAIN on port $PORT..."

# 1. Ensure Nginx is installed
if ! command -v nginx > /dev/null 2>&1; then
    apt update && apt install -y nginx certbot python3-certbot-nginx
fi

# 2. Create Nginx Configuration
cat <<EOT > /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN;

    location = /mail {
        return 301 /mail/;
    }

    location /mail/ {
        proxy_pass http://127.0.0.1:3007/mail/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOT

# 3. Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# 4. Test and Reload Nginx
nginx -t && systemctl reload nginx

# 5. Run Certbot
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo "✅ SSL Provisioned successfully for $DOMAIN!"
