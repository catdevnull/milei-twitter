FROM node:22 AS base
RUN apt-get update && \
    apt-get install -y ca-certificates curl jq sqlite3 tini xauth && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/package.json
COPY scraper-manzana/package.json scraper-manzana/package.json
RUN corepack enable
WORKDIR /app/scraper-manzana

FROM base
ENTRYPOINT ["tini", "--"]
ARG SUPERCRONIC_VERSION=v0.2.33
ARG TARGETARCH
RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) supercronic_arch=amd64; supercronic_sha1=71b0d58cc53f6bd72cf2f293e09e294b79c666d8 ;; \
      arm64) supercronic_arch=arm64; supercronic_sha1=e0f0c06ebc5627e43b25475711e694450489ab00 ;; \
      *) echo "unsupported TARGETARCH=${TARGETARCH:-}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-${supercronic_arch}" -o /usr/local/bin/supercronic; \
    echo "${supercronic_sha1}  /usr/local/bin/supercronic" | sha1sum -c -; \
    chmod +x /usr/local/bin/supercronic
RUN pnpm install --filter=api --filter=scraper-manzana --prod
COPY scraper-manzana/ensure-rebrowser-patches.mjs ensure-rebrowser-patches.mjs
RUN pnpm run rebrowser:ensure && pnpm exec playwright install --with-deps chromium
WORKDIR /app
COPY . .
WORKDIR /app/scraper-manzana
RUN mkdir -p /usr/local/bin \
    && cp /app/scraper-manzana/run-scraper-once.sh /usr/local/bin/run-scraper-once \
    && chmod +x /usr/local/bin/run-scraper-once

ENV NODE_ENV=production
ENV DBS_PATH=/db

CMD ["supercronic", "/app/scraper-manzana/crontab"]
