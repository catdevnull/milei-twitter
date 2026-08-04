#!/usr/bin/env bash
set -euo pipefail

staging_dir="${1:?staging directory is required}"
install_dir="/opt/milei-twitter"
config_dir="/etc/twitter-gateway"
state_dir="/var/lib/twitter-gateway"
service_user="twitter-gateway"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm rsync
fi

if ! command -v pnpm >/dev/null; then
  npm install --global pnpm@9.15.4
fi

if ! id "${service_user}" >/dev/null 2>&1; then
  useradd \
    --system \
    --home-dir "${state_dir}" \
    --create-home \
    --shell /usr/sbin/nologin \
    "${service_user}"
fi

mkdir -p "${install_dir}" "${config_dir}" "${state_dir}"
rsync \
  --archive \
  --delete \
  --exclude='twitter-gateway/api-users.txt' \
  --exclude='twitter-gateway/*.sqlite' \
  --exclude='twitter-gateway/*.sqlite-shm' \
  --exclude='twitter-gateway/*.sqlite-wal' \
  "${staging_dir}/" \
  "${install_dir}/"

cd "${install_dir}"
pnpm install --frozen-lockfile

export PLAYWRIGHT_BROWSERS_PATH="${state_dir}/ms-playwright"
# Playwright 1.52 predates Ubuntu 26.04. Its Ubuntu 24.04 Chromium build is
# compatible, but needs an explicit platform override until Playwright is bumped.
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="ubuntu24.04-x64"
pnpm --dir scraper-manzana exec playwright install --with-deps chromium

install -o root -g "${service_user}" -m 0640 \
  deploy/twitter-gateway/twitter-gateway.env.example \
  "${config_dir}/twitter-gateway.env.example"
if [[ ! -f "${config_dir}/twitter-gateway.env" ]]; then
  install -o root -g "${service_user}" -m 0640 \
    deploy/twitter-gateway/twitter-gateway.env.example \
    "${config_dir}/twitter-gateway.env"
fi
touch "${config_dir}/accounts.txt" "${config_dir}/api-users.txt"
chown root:"${service_user}" \
  "${config_dir}/accounts.txt" \
  "${config_dir}/api-users.txt"
chmod 0640 \
  "${config_dir}/accounts.txt" \
  "${config_dir}/api-users.txt"
chown -R "${service_user}:${service_user}" "${state_dir}"

install -o root -g root -m 0644 \
  deploy/twitter-gateway/twitter-gateway.service \
  /etc/systemd/system/twitter-gateway.service

systemctl daemon-reload
systemctl enable --now twitter-gateway.service
systemctl restart twitter-gateway.service
systemctl --no-pager --full status twitter-gateway.service
