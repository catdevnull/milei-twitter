FROM cgr.dev/chainguard/wolfi-base as base
RUN apk add --no-cache nodejs-20 corepack sqlite tini
ENTRYPOINT ["tini", "--"]
RUN corepack enable && corepack prepare pnpm@8.15.7 --activate
WORKDIR /app
COPY . .
WORKDIR /app/scraper-manzana

FROM base as build
RUN pnpm install --filter=scraper-manzana
RUN pnpm build \
 && cp -r dbs/* dist/

FROM base
RUN pnpm install --filter=scraper-manzana --prod
COPY --from=build /app/scraper-manzana/dist dist
RUN mkdir -p /usr/local/bin \
 && echo -e '#!/bin/sh\nexec node /app/scraper-manzana/dist/cli.js "$@"' > /usr/local/bin/cli \
 && chmod +x /usr/local/bin/cli

ENV NODE_ENV=production
ENV DBS_PATH=/db
VOLUME /db

CMD ["cli", "cron"]
