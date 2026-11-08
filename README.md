# milei-twitter

un coso que scrapea los twits que likea Milei en Twitter

## empezar a desarrollar

```
pnpm install
echo 'ADMIN_PASSWORD=contraseña' > .env
pnpm dev
```

~~anda a `/admin` y logeate con la contraseña. agrega una cuenta de Twitter copiando las cookies `auth_token` y `ct0`.~~
esto está desactualizado

### scraper

podes correrlo manualmente:

```
cd scraper-manzana
pnpm cron:once
```

En prod, el contenedor `docker/scraper-manzana.Dockerfile` corre `supercronic`
con `scraper-manzana/crontab`. El job corre cada media hora y manda un mensaje
a Telegram si falla.

Variables necesarias:

- `API_TOKEN`
- `API_URL` (opcional, default `https://milei.nulo.lol`)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TWITTER_GATEWAY_API_KEY` for the primary Twitter gateway.
- `TWITTER_GATEWAY_URL` (optional, default `https://docial.nulo.lol`).

Each successful cron scrape also stores a gateway-only snapshot of Milei's 40
most recent non-retweets in `db_tweet_snapshots`, keyed by tweet ID and scrape
time. The full normalized gateway tweet objects are kept, including
`raw_twitter`, `favorite_count`, and `views_count`. The cron does not fall back
to SocialAPI. The unlinked, `noindex` route `/internal/tweet-history` shows the
history.

En producción corre como el servicio `milei-scraper` de `uncloud.yaml`, junto
al sitio, la base de datos y el gateway. Las variables van en
`.uncloud/milei-scraper.env` (plantilla en
`deploy/uncloud/env/milei-scraper.env.example`). Para desplegar:

```
DEPLOY_SSH=usuario@host just deploy milei-scraper
```

## producción

```
git pull && pnpm install && pnpm build && cp -r drizzle build/
node -r dotenv/config build
# en otra tty, para probar una corrida del scraper
cd scraper-manzana && pnpm cron:once
```
