FROM node:22-bookworm

# Same pnpm as the lockfile and the old systemd deploy (install.sh).
RUN npm install --global pnpm@9.15.4

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/package.json
COPY scraper-manzana/package.json scraper-manzana/package.json
COPY twitter-gateway/package.json twitter-gateway/package.json
# tsx is a devDependency but runs the service, so install everything.
RUN pnpm install --frozen-lockfile --filter "twitter-gateway..."

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pnpm --dir scraper-manzana exec playwright install --with-deps chromium

COPY . .
WORKDIR /app/twitter-gateway

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    TWITTER_BROWSER_HEADLESS=1 \
    TWITTER_DEBUG_DIR=/data/debug \
    SQLITE_PATH=/data/twitter-gateway.sqlite \
    ACCOUNTS_FILE_PATH=/data/accounts.txt \
    API_AUTH_FILE=/data/api-users.txt
EXPOSE 3000

CMD ["node", "--import", "tsx", "src/index.ts"]
