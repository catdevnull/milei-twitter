FROM node:22
RUN corepack enable
WORKDIR /usr/src/app
RUN apt-get update && \
    apt-get install -y jq sqlite3 && \
    rm -rf /var/lib/apt/lists/*

COPY . .
WORKDIR sitio/
ARG DATABASE_URL
RUN pnpm install --filter '...!better-sqlite3' && \
    pnpm build

ENV BODY_SIZE_LIMIT=5242880
ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

CMD ["node", "build/"]