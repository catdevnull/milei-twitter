FROM docker.io/node:20

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chrome that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y chromium fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 dbus dbus-x11 \
      --no-install-recommends \
    && service dbus start \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser

ENV DBUS_SESSION_BUS_ADDRESS autolaunch:

USER pptruser
WORKDIR /app
COPY --chown=pptruser:pptruser . .
WORKDIR /app/scraper/
RUN npx pnpm install --prod

ENV DB_PATH=/db/db.db
EXPOSE 3000

ENTRYPOINT ["npm", "start"]
CMD ["cron"]