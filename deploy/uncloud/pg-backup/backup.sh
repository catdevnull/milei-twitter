#!/bin/sh
# Usage: backup            (dumps every target in PG_TARGETS)
# PG_TARGETS is a space-separated list of host:database:PASSWORD_ENV_VAR, e.g.
#   "milei-db.internal:milei:MILEI_DB_PASSWORD flybondi-db.internal:flybondi:FLYBONDI_DB_PASSWORD"
set -eu -o pipefail

: "${PG_TARGETS:?}" "${S3_BUCKET:?}" "${S3_ENDPOINT:?}"
prefix="${S3_PREFIX:-uncloud}"
stamp="$(date -u +%Y-%m-%d-%H-%M-%S)"
status=0

for target in $PG_TARGETS; do
  host="${target%%:*}"
  rest="${target#*:}"
  db="${rest%%:*}"
  password_var="${rest#*:}"
  password="$(printenv "$password_var")"
  key="s3://${S3_BUCKET}/${prefix}/${db}/${db}-${stamp}.dump"

  echo "$(date -u -Iseconds) backing up ${db} from ${host} to ${key}"
  if PGPASSWORD="$password" pg_dump -h "$host" -U postgres -Fc "$db" \
    | aws s3 cp - "$key" --endpoint-url "$S3_ENDPOINT"; then
    echo "$(date -u -Iseconds) ${db} done"
  else
    echo "$(date -u -Iseconds) ${db} FAILED" >&2
    status=1
  fi
done

exit "$status"
