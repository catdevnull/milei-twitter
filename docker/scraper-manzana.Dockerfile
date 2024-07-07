FROM node:20 as base
RUN apt-get update && \
    apt-get install -y jq sqlite3 tini && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
WORKDIR /app/scraper-manzana
RUN corepack enable

FROM base as build
RUN pnpm install --filter=scraper-manzana
RUN pnpm build \
    && cp -r dbs/* dist/

FROM base
ENTRYPOINT ["tini", "--"]
RUN pnpm install --filter=scraper-manzana --prod
COPY --from=build /app/scraper-manzana/dist dist
RUN mkdir -p /usr/local/bin \
    && echo '#!/bin/sh\nexec node /app/scraper-manzana/dist/cli.cjs "$@"' > /usr/local/bin/cli \
    && chmod +x /usr/local/bin/cli

ENV NODE_ENV=production
ENV DBS_PATH=/db
VOLUME /db

CMD ["cli", "cron"]
