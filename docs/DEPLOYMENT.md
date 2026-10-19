# Deployment guide

Target: a Linux VPS (Ubuntu 24.04 LTS) with Node.js 22, MySQL 8, Nginx and systemd. Any provider works; a Gulf (UAE, Bahrain or Saudi) or EU region keeps latency low for users across the GCC. Shared PHP/cPanel hosting will **not** run this application.

## 1. Server preparation

```bash
sudo apt update && sudo apt install -y nginx mysql-server git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo adduser --system --group --home /srv/hiremegulf hiremegulf
```

Optional malware scanning for CV uploads:

```bash
sudo apt install -y clamav-daemon && sudo systemctl enable --now clamav-daemon
# then set CLAMAV_HOST=127.0.0.1 and CLAMAV_PORT=3310 (configure clamd for TCP on localhost)
```

When `CLAMAV_HOST` is set, uploads are rejected if the scanner is unreachable (fail closed).

## 2. Database

```sql
CREATE DATABASE hiremegulf CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'hiremegulf'@'localhost' IDENTIFIED BY '<strong password>';
GRANT ALL PRIVILEGES ON hiremegulf.* TO 'hiremegulf'@'localhost';
```

## 3. Build and configure

On a build machine or the server:

```bash
git clone <repo> /srv/hiremegulf/src && cd /srv/hiremegulf/src
npm ci && npm test && npm run build
```

Create `/srv/hiremegulf/src/build/.env` (never commit it):

```
NODE_ENV=production
HOST=127.0.0.1
PORT=3333
APP_NAME=HireMeGulf
APP_URL=https://www.hiremegulf.com
APP_KEY=<node ace generate:key --show>
LOG_LEVEL=info
TZ=UTC
SESSION_DRIVER=database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=hiremegulf
DB_PASSWORD=<password>
DB_DATABASE=hiremegulf
MAIL_MAILER=smtp
MAIL_FROM_ADDRESS=no-reply@hiremegulf.com
MAIL_FROM_NAME=HireMeGulf
SUPPORT_EMAIL=support@hiremegulf.com
SMTP_HOST=<provider host>
SMTP_PORT=587
SMTP_USERNAME=<user>
SMTP_PASSWORD=<password>
SMTP_SECURE=false
QUEUE_DRIVER=database
LIMITER_STORE=database
DRIVE_DISK=public
CV_MAX_SIZE_MB=5
CLAMAV_HOST=
CLAMAV_PORT=3310
```

Then:

```bash
cd build
npm ci --omit=dev
mkdir -p storage/public storage/private tmp
node ace migration:run --force
node ace db:seed --files database/seeders/01_reference_seeder.js   # reference data only; never the demo seeder
node ace admin:create --email=admin@hiremegulf.com --name="Site Admin"
sudo chown -R hiremegulf:hiremegulf /srv/hiremegulf
chmod 750 storage/private
```

## 4. Storage permissions

- `storage/private` holds CVs. It must **not** be served by Nginx and should be readable only by the `hiremegulf` user. CVs leave the server only through `/files/cvs/:id`, which authorises and logs every download.
- `storage/public` holds logos and profile photos and is served at `/uploads` by the app (Nginx can serve it directly, see below).
- Keep `storage/` outside the release directory (or symlink it) so deployments don't overwrite uploads.

## 5. Processes (systemd)

`/etc/systemd/system/hiremegulf-web.service`

```ini
[Unit]
Description=HireMeGulf web
After=network.target mysql.service

[Service]
User=hiremegulf
WorkingDirectory=/srv/hiremegulf/src/build
ExecStart=/usr/bin/node bin/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/hiremegulf-queue.service` — same as above with `ExecStart=/usr/bin/node ace queue:work`.

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now hiremegulf-web hiremegulf-queue
```

## 6. Scheduled tasks (cron for the hiremegulf user)

```
# 02:05 Gulf time (UTC+3) = 23:05 UTC
5 23 * * *  cd /srv/hiremegulf/src/build && /usr/bin/node ace jobs:expire >> /var/log/hiremegulf/cron.log 2>&1
15 * * * *  cd /srv/hiremegulf/src/build && /usr/bin/node ace alerts:send >> /var/log/hiremegulf/cron.log 2>&1
```

## 7. Nginx + HTTPS

```nginx
server {
  server_name www.hiremegulf.com;
  client_max_body_size 12m;

  location /uploads/ { alias /srv/hiremegulf/src/build/storage/public/; expires 30d; }
  location /assets/  { alias /srv/hiremegulf/src/build/public/assets/; expires 1y; add_header Cache-Control "public, immutable"; }

  location / {
    proxy_pass http://127.0.0.1:3333;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d www.hiremegulf.com
```

Secure cookies and HSTS switch on automatically when `NODE_ENV=production`; the app must only be reachable over HTTPS.

## 8. Backups and recovery

- **Database:** nightly `mysqldump --single-transaction hiremegulf | gzip` to off-server storage, 30-day retention.
- **Files:** nightly `rsync`/`restic` of `storage/` (CVs, logos) to encrypted off-server storage.
- **Restore drill:** restore both into a staging server monthly and run the app against them.
- **Keys:** keep `.env` (especially `APP_KEY`) in a secrets manager; sessions and tokens depend on it.

## 9. Monitoring

- `GET /health` returns `{ ok: true }` for uptime checks.
- Logs are JSON on stdout (`journalctl -u hiremegulf-web`). Ship them to your log service and alert on level ≥ 50.
- Admin → Platform settings shows queued and permanently failed background jobs (usually SMTP problems) with a retry button.
- Run `npm audit --omit=dev` on each release.

## 10. Releasing and rolling back

1. Build a new release directory (`releases/<timestamp>/build`), `npm ci --omit=dev`, link the shared `.env` and `storage/`.
2. `node ace migration:run --force` (migrations are additive; review any destructive migration before running).
3. Switch the `current` symlink and `systemctl restart hiremegulf-web hiremegulf-queue`.

**Rollback:** point `current` back to the previous release and restart. If a migration must be undone, `node ace migration:rollback --force` runs the last batch's `down()`; take a database backup before any release that alters existing columns.

## Troubleshooting

| Symptom | Check |
|---|---|
| Emails not arriving | `hiremegulf-queue` running? Failed jobs in Admin → settings? SMTP credentials and SPF/DKIM for the sender domain |
| 419/redirect loops on forms | `APP_URL` matches the public HTTPS URL; proxy sends `X-Forwarded-Proto` |
| CV upload rejected "could not scan" | ClamAV configured but not reachable on `CLAMAV_HOST:CLAMAV_PORT` |
| Jobs never close | cron for `jobs:expire` not installed (search still hides expired jobs) |
