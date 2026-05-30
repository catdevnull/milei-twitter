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
- Variables del scraper de Twitter/SocialData según el modo usado.

En `absolute-slop`, esto encaja como un Compose app separado del Dokku app
`milei`. La plantilla está en `deploy/scraper/`:

```
cd deploy/scraper
cp .env.example .env.production
# completar secretos
docker compose up -d --build
```

## producción

```
git pull && pnpm install && pnpm build && cp -r drizzle build/
node -r dotenv/config build
# en otra tty, para probar una corrida del scraper
cd scraper-manzana && pnpm cron:once
```
