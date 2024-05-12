FROM node:20 AS base
RUN corepack enable
WORKDIR /usr/src/app

FROM base as build

COPY . .
WORKDIR sitio/
RUN pnpm install && \
    pnpm build

FROM base
ENV NODE_ENV=production
RUN apt-get update && \
    apt-get install -y jq sqlite3 tini && \
    rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["tini", "--"]
# glib libnss dbus-libs libatk-1.0 libatk-bridge-2.0 cups-libs libdrm libxkbcommon libxcomposite libxdamage libxrandr mesa-gbm pango alsa-lib freetype harfbuzz ca-certificates

# Sitio
COPY --from=build /usr/src/app/sitio/build/ /usr/src/sitio
WORKDIR /usr/src/sitio
COPY --from=build /usr/src/app/pnpm-lock.yaml /usr/src/
COPY --from=build /usr/src/app/pnpm-workspace.yaml /usr/src/
COPY --from=build /usr/src/app/api /usr/src/api
COPY --from=build /usr/src/app/sitio/package.json package.real.json
COPY --from=build /usr/src/app/sitio/drizzle/ drizzle
COPY --from=build /usr/src/app/sitio/src/lib/db/historicLikes/likes.tsv.br src/lib/db/historicLikes/likes.tsv.br
RUN sh -c 'echo {\"name\":\"sitio\",\"type\":\"module\",\"dependencies\":$(jq .dependencies < package.real.json)} > package.json'
RUN pnpm install --prod

ENV TURSO_CONNECTION_URL=file:/db/db.db
ENV BODY_SIZE_LIMIT=5242880
EXPOSE 3000

CMD ["node", "."]