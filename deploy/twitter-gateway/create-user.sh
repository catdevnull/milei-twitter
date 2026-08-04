#!/usr/bin/env bash
set -euo pipefail

api_user_name="${1:-}"

if [[ -z "${api_user_name}" ]]; then
  echo "Usage: pnpm --filter twitter-gateway user:create:prod -- <name>" >&2
  exit 1
fi

if [[ ! "${api_user_name}" =~ ^[a-zA-Z0-9_.-]+$ ]]; then
  echo "API user names may only contain letters, numbers, dots, underscores, and hyphens." >&2
  exit 1
fi

deploy_host="${DEPLOY_HOST:-110.172.148.79}"
deploy_user="${DEPLOY_USER:-alwyzon}"
deploy_target="${deploy_user}@${deploy_host}"
ssh_options=(
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
)

ssh "${ssh_options[@]}" "${deploy_target}" \
  "cd /opt/milei-twitter/twitter-gateway && sudo env API_AUTH_FILE=/etc/twitter-gateway/api-users.txt /usr/bin/node --import tsx src/cli.ts create-user '${api_user_name}' && sudo chown root:twitter-gateway /etc/twitter-gateway/api-users.txt && sudo chmod 0640 /etc/twitter-gateway/api-users.txt"
