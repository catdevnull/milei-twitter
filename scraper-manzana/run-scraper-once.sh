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
CRON_URL="https://o4507188153548800.ingest.de.sentry.io/api/4507188155646032/cron/milei-scraper/79b56150c5092cdad5c56c62223a1a5d/"
curl -sf -X POST "$CRON_URL" -H 'Content-Type: application/json' -d '{
  "status": "in_progress",
  "monitor_config": {
    "schedule": {"type": "crontab", "value": "*/30 * * * *"},
    "checkin_margin": 10,
    "max_runtime": 30,
    "timezone": "Etc/UTC",
    "failure_issue_threshold": 2
  }
}' >/dev/null || true

if timeout --kill-after=2m 25m \
  xvfb-run -a --server-args="-screen 0 1280x900x24" \
  pnpm exec tsx cron-runner.ts 9>&-; then
  curl -sf "${CRON_URL}?status=ok" >/dev/null || true
else
  rc=$?
  curl -sf "${CRON_URL}?status=error" >/dev/null || true
  exit "$rc"
fi
