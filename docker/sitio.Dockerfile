FROM node:24
RUN corepack enable
WORKDIR /usr/src/app
RUN apt-get update && \
    apt-get install -y jq sqlite3 tini && \
    rm -rf /var/lib/apt/lists/*

COPY . .
WORKDIR sitio/
ARG DATABASE_URL
RUN pnpm install --filter '...!better-sqlite3' && \
    pnpm build
ENTRYPOINT ["tini", "--"]
RUN pnpm install --prod --filter '...!better-sqlite3'

ENV BODY_SIZE_LIMIT=5242880
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "."]