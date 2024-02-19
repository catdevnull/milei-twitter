# milei-twitter

un coso que scrapea los twits que likea Milei en Twitter

## empezar a desarrollar

```
pnpm install
echo 'ADMIN_PASSWORD=contraseña' > .env
pnpm dev
```

anda a `/admin` y logeate con la contraseña. agrega una cuenta de Twitter copiando las cookies `auth_token` y `ct0`.

### scraper

podes correrlo manualmente:

```
pnpm scraper:run scrap retweets
pnpm scraper:run scrap likes
# y fijate con --help porque hay flags para debuggear, etc
```

o lo que se usa en prod que es el cron:

```
pnpm scraper:run cron
```

## producción

```
git pull && pnpm install && pnpm build && cp -r drizzle build/
node -r dotenv/config build
# en otra tty
pnpm scraper:run cron
```
