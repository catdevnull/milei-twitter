# Production runs on an Uncloud cluster (`uc` reads the connection from
# ~/.config/uncloud/config.yaml). Images are too big to push from a laptop, so
# they're built on the server: set DEPLOY_SSH=user@host for that machine.

# Build images on the server and roll out the given services.
deploy +services="milei milei-scraper twitter-gateway pg-backup":
    #!/usr/bin/env bash
    set -euo pipefail
    server="${DEPLOY_SSH:?set DEPLOY_SSH=user@host of the Uncloud machine}"
    rsync -az --delete \
      --exclude node_modules --exclude .git --exclude .uncloud --exclude '.env*' \
      --exclude backups --exclude data --exclude research --exclude seguidoresDeMilei \
      --exclude load-test-results --exclude '*.sqlite*' --exclude api-users.txt \
      --exclude .svelte-kit --exclude build \
      ./ "$server:src/milei-twitter/"
    for svc in {{services}}; do
      case "$svc" in
        milei) args="-t milei/site:latest -f docker/sitio.Dockerfile ." ;;
        milei-scraper) args="-t milei/scraper:latest -f docker/scraper-manzana.Dockerfile ." ;;
        twitter-gateway) args="-t milei/twitter-gateway:latest -f docker/twitter-gateway.Dockerfile ." ;;
        pg-backup) args="-t milei/pg-backup:latest deploy/uncloud/pg-backup" ;;
        *) args="" ;;
      esac
      if [ -n "$args" ]; then
        echo "building $svc"
        ssh "$server" "cd src/milei-twitter && docker build -q $args"
      fi
    done
    uc deploy -f uncloud.yaml --no-build --recreate -y {{services}}

# Create a Twitter gateway API user and print its key.
gateway-user name:
    uc exec twitter-gateway node --import tsx src/cli.ts create-user {{name}}

# Apply a SQL migration file to the production database.
migrate file:
    uc exec -T milei-db psql -U postgres -d milei -v ON_ERROR_STOP=1 < {{file}}
