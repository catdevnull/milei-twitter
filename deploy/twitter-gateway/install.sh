#!/usr/bin/env bash
set -euo pipefail

staging_dir="${1:?staging directory is required}"
install_dir="/opt/milei-twitter"
config_dir="/etc/twitter-gateway"
state_dir="/var/lib/twitter-gateway"
service_user="twitter-gateway"

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="$(node --eval 'process.stdout.write(process.versions.node.split(".")[0])')"
fi

# node:sqlite is available in Node 22+. Ubuntu 24.04 ships Node 18 by default,
# so install the supported runtime explicitly instead of accepting any Node.
if (( node_major < 22 )); then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg
  curl --fail --silent --show-error --location \
    https://deb.nodesource.com/setup_22.x \
    --output /tmp/nodesource_setup_22.sh
  bash /tmp/nodesource_setup_22.sh
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

if ! command -v rsync >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y rsync
fi

if ! command -v pnpm >/dev/null; then
  npm install --global pnpm@9.15.4
fi

if ! command -v caddy >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
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
install -o root -g root -m 0644 \
  deploy/twitter-gateway/Caddyfile \
  /etc/caddy/Caddyfile

systemctl daemon-reload
systemctl enable --now twitter-gateway.service
systemctl restart twitter-gateway.service
systemctl enable --now caddy.service
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy.service
systemctl --no-pager --full status twitter-gateway.service
