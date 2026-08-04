#!/usr/bin/env bash
set -euo pipefail

deploy_host="${DEPLOY_HOST:-110.172.148.79}"
deploy_user="${DEPLOY_USER:-alwyzon}"
deploy_target="${deploy_user}@${deploy_host}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
staging_dir="/home/${deploy_user}/milei-twitter-deploy"

ssh_options=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)

rsync \
  --archive \
  --compress \
  --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='load-test-results/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='api-users.txt' \
  --exclude='*.sqlite' \
  --exclude='*.sqlite-shm' \
  --exclude='*.sqlite-wal' \
  -e "ssh ${ssh_options[*]}" \
  "${repo_root}/" \
  "${deploy_target}:${staging_dir}/"

ssh "${ssh_options[@]}" "${deploy_target}" \
  "sudo bash '${staging_dir}/deploy/twitter-gateway/install.sh' '${staging_dir}'"

printf 'twitter-gateway deployed to %s\n' "${deploy_host}"
