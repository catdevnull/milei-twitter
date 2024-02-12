# milei-twitter

un coso que scrapea los twits que likea Milei en Twitter

## empezar a desarrollar

```
pnpm install
echo 'ADMIN_PASSWORD=contraseña' > .env
pnpm dev
```

anda a `/admin` y logeate con la contraseña. agrega una cuenta de Twitter copiando las cookies `auth_token` y `ct0`.

los scraps en dev corren solo una vez, en prod corren cada ~1 minuto.

## producción

```
git pull && pnpm install && pnpm build && cp -r drizzle build/
node -r dotenv/config build
```
