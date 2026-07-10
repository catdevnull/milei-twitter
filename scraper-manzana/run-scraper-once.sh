#!/bin/sh
set -eu

cd /app/scraper-manzana

exec 9>/tmp/milei-twitter-scraper.lock
if ! flock -n 9; then
  echo "[cron] previous scraper run is still active; skipping"
  exit 0
fi

# 9>&- closes the lock fd in the child: if timeout SIGKILLs the run, xvfb-run's
# cleanup trap never fires and Xvfb survives — it must not inherit the lock or
# it blocks every future run until someone kills it by hand.
timeout --kill-after=2m 25m \
  xvfb-run -a --server-args="-screen 0 1280x900x24" \
  pnpm exec tsx cron-runner.ts 9>&-
