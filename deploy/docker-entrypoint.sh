#!/bin/sh
# Prepares persistent storage, runs migrations and seeders, then starts the app.
set -e
cd /app
DATA_DIR="${DATA_DIR:-/var/data}"

# SQLite lives at <app>/tmp/db.sqlite3 and uploads at <app>/storage/{public,private}.
# Point both at the persistent data dir so they survive restarts/redeploys.
mkdir -p "$DATA_DIR/tmp" "$DATA_DIR/storage/public" "$DATA_DIR/storage/private"
for d in tmp storage; do
  if [ ! -L "$d" ]; then rm -rf "$d"; ln -s "$DATA_DIR/$d" "$d"; fi
done

if [ -z "$APP_KEY" ]; then echo "APP_KEY is required (generate with: node ace generate:key --show)" >&2; exit 1; fi
: "${APP_URL:=http://localhost:${PORT:-3333}}"; export APP_URL

node ace migration:run --force
node ace db:seed --files database/seeders/01_reference_seeder.js

# Fictional demo companies/candidates (password DemoPass#2026). The demo seeder
# refuses to run when NODE_ENV=production, so it is run once in development mode
# against the same database. Set SEED_DEMO=false for a real launch.
if [ "$SEED_DEMO" = "true" ]; then
  NODE_ENV=development node ace db:seed --files database/seeders/02_demo_seeder.js
fi

# Optional admin bootstrap: set ADMIN_EMAIL + ADMIN_PASSWORD (min 10 chars).
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  node ace admin:create --email="$ADMIN_EMAIL" --name="${ADMIN_NAME:-Site Admin}"
fi

exec "$@"
