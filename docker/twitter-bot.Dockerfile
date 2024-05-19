FROM node:22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# https://pnpm.io/docker
COPY . /app
WORKDIR /app

FROM base AS prod-deps
WORKDIR /app/twitter-bot
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# FROM base AS build
# WORKDIR /app/twitter-bot
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# RUN npx esbuild --bundle --platform=node --format=esm index.js > /build.js


FROM node:22-slim
# Add Tini
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

WORKDIR /app/twitter-bot
COPY --from=prod-deps /app/common /app/common
COPY --from=prod-deps /app/twitter-bot /app/twitter-bot
ENV DBS_PATH=/db
VOLUME [ "/db" ]
CMD [ "node", "." ]





# COPY twitter-bot/package.json .
# COPY twitter-bot/pnpm-lock.yaml .
# RUN pnpm install
# COPY twitter-bot/ .
# RUN pnpm install

# FROM base
# ENV NODE_ENV=production
# RUN apk add --no-cache nodejs npm jq sqlite

# # Sitio
# COPY --from=build /build.js index.js
# COPY --from=build /usr/src/app/package.json package.real.json
# RUN sh -c 'echo {\"name\":\"sitio\",\"type\":\"module\",\"dependencies\":$(jq .dependencies < package.real.json)} > package.json'
# RUN npm install

# ENV DBS_PATH=/db
# EXPOSE 3000

# CMD ["node", "."]