#!/usr/bin/env bash
# One-shot installer for QatarHire on an Ubuntu droplet that may already host other sites.
# Usage: curl -fsSL https://raw.githubusercontent.com/mahmudurrahman420/qatarhire/main/deploy/droplet-setup.sh | sudo ADMIN_PASSWORD='...' bash
# Runs the app in Docker on 127.0.0.1:3390 and adds a reverse-proxy vhost for $DOMAIN to the
# existing web server (nginx or apache). Designed for Cloudflare in front (SSL mode Flexible).
set -euo pipefail
DOMAIN="${DOMAIN:-hiremegulf.com}"
APP_DIR=/opt/qatarhire
PORT_LOCAL=3390
ENVF=/etc/qatarhire/env
LOG=/var/log/qatarhire-setup.log
exec > >(tee -a "$LOG") 2>&1
echo "== QatarHire setup $(date -u) =="

command -v git >/dev/null || (apt-get update -y && apt-get install -y git)
if ! command -v docker >/dev/null; then echo "Installing Docker"; curl -fsSL https://get.docker.com | sh; fi
systemctl enable --now docker

if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" fetch -q origin && git -C "$APP_DIR" reset -q --hard origin/main
else git clone -q https://github.com/mahmudurrahman420/qatarhire "$APP_DIR"; fi

mkdir -p /etc/qatarhire && chmod 700 /etc/qatarhire
if [ ! -f "$ENVF" ]; then
  APP_KEY=$(openssl rand -base64 32 | tr -d '\n=/+' | cut -c1-40)
  cat > "$ENVF" <<ENV
NODE_ENV=production
HOST=0.0.0.0
PORT=3333
APP_KEY=$APP_KEY
APP_URL=https://$DOMAIN
APP_NAME=QatarHire
DB_CONNECTION=sqlite
SESSION_DRIVER=database
LIMITER_STORE=database
QUEUE_DRIVER=sync
MAIL_MAILER=log
MAIL_FROM_ADDRESS=no-reply@$DOMAIN
SUPPORT_EMAIL=support@$DOMAIN
SEED_DEMO=true
ADMIN_EMAIL=admin@qatarhire.example
ADMIN_PASSWORD=${ADMIN_PASSWORD:-}
ENV
  chmod 600 "$ENVF"
fi

echo "Building image (a few minutes)"
docker build -q -t qatarhire "$APP_DIR"
docker rm -f qatarhire >/dev/null 2>&1 || true
docker run -d --name qatarhire --restart unless-stopped --memory 1g \
  -p 127.0.0.1:$PORT_LOCAL:3333 --env-file "$ENVF" -v qatarhire-data:/var/data qatarhire >/dev/null

echo "Waiting for app"
ok=0; for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORT_LOCAL/health" >/dev/null 2>&1; then ok=1; break; fi; sleep 3; done
[ $ok = 1 ] || { docker logs --tail 40 qatarhire; echo "QATARHIRE_SETUP_FAILED app"; exit 1; }

LISTENER=$(ss -ltnpH 'sport = :80' | grep -o 'users:(("[^"]*' | head -1 | sed 's/.*"//' || true)
echo "Port 80 listener: ${LISTENER:-none}"
if [ -z "$LISTENER" ]; then apt-get update -y && apt-get install -y nginx; LISTENER=nginx; fi

case "$LISTENER" in
  nginx*)
    CONF=/etc/nginx/sites-available/$DOMAIN
    [ -d /etc/nginx/sites-available ] || CONF=/etc/nginx/conf.d/$DOMAIN.conf
    cat > "$CONF" <<NG
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:$PORT_LOCAL;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$http_x_forwarded_proto;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
NG
    if [ -d /etc/nginx/sites-enabled ] && [[ "$CONF" == /etc/nginx/sites-available/* ]]; then ln -sf "$CONF" /etc/nginx/sites-enabled/$DOMAIN; fi
    nginx -t && systemctl reload nginx ;;
  apache*|httpd*)
    a2enmod -q proxy proxy_http headers >/dev/null
    cat > /etc/apache2/sites-available/$DOMAIN.conf <<AP
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:$PORT_LOCAL/
    ProxyPassReverse / http://127.0.0.1:$PORT_LOCAL/
</VirtualHost>
AP
    a2ensite -q $DOMAIN >/dev/null && apache2ctl configtest && systemctl reload apache2 ;;
  *) echo "Unknown web server on :80 ($LISTENER); app is running on 127.0.0.1:$PORT_LOCAL"; echo "QATARHIRE_SETUP_PARTIAL"; exit 0 ;;
esac

code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" -H "X-Forwarded-Proto: https" http://127.0.0.1/)
echo "Vhost check via port 80: HTTP $code"
[ "$code" = 200 ] && echo "QATARHIRE_SETUP_OK" || echo "QATARHIRE_SETUP_CHECK_VHOST"
