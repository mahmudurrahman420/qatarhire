# HireMeGulf — production image (AdonisJS 6 + Inertia/React, SQLite or MySQL)
# Build:  docker build -t qatarhire .
# Run:    docker run -p 3333:3333 -e APP_KEY=... -e APP_URL=https://your.domain -v qh-data:/var/data qatarhire

# ---- build stage -------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /src
# toolchain in case better-sqlite3 has to compile from source
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN node ace build

# ---- production deps ---------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=build /src/build/package.json /src/build/package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime -----------------------------------------------------------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    TZ=UTC \
    LOG_LEVEL=info \
    APP_NAME=HireMeGulf \
    SESSION_DRIVER=database \
    DB_CONNECTION=sqlite \
    MAIL_MAILER=log \
    MAIL_FROM_ADDRESS=no-reply@hiremegulf.local \
    MAIL_FROM_NAME=HireMeGulf \
    SUPPORT_EMAIL=support@hiremegulf.local \
    QUEUE_DRIVER=sync \
    LIMITER_STORE=database \
    DRIVE_DISK=public \
    CV_MAX_SIZE_MB=5 \
    DATA_DIR=/var/data \
    SEED_DEMO=true
WORKDIR /app
COPY --from=build /src/build ./
COPY --from=deps /app/node_modules ./node_modules
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /var/data && chown -R node:node /app /var/data
USER node
EXPOSE 3333
VOLUME ["/var/data"]
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3333)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "bin/server.js"]
