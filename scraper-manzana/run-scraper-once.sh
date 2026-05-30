#!/bin/sh
set -eu

cd /app/scraper-manzana

if ! flock -n /tmp/milei-twitter-scraper.lock true; then
  echo "[cron] previous scraper run is still active; skipping"
  exit 0
fi

exec flock -n /tmp/milei-twitter-scraper.lock \
  xvfb-run -a --server-args="-screen 0 1280x900x24" \
  pnpm exec tsx cron-runner.ts
