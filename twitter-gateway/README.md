# twitter-gateway

A small Hono service that mirrors the requested SocialAPI routes using the
repository's existing Playwright Twitter scraper. It runs on Node through
`tsx`, uses file-backed Bearer API authentication, and includes the raw Twitter
GraphQL result as `raw_twitter` on returned tweets and users.

## Create an API user

```sh
pnpm --filter twitter-gateway user:create -- local
```

The command prints the new key once and appends it to `api-users.txt` as
`name:key`. Set `API_AUTH_FILE` to use another file. The service reloads the
file on each request, so new users work without a restart.

Create an API user directly in production from your local checkout:

```sh
pnpm --filter twitter-gateway user:create:prod -- alice
```

This SSHes to `alwyzon@110.172.148.79`, adds the user to
`/etc/twitter-gateway/api-users.txt`, and prints the generated API key. The
running service picks it up without a restart. Set `DEPLOY_HOST` or
`DEPLOY_USER` to override the SSH destination.

Call Twitter routes with:

```sh
curl -H "Authorization: Bearer API_KEY" \
  http://localhost:3000/twitter/user/JMilei
```

## Run

```sh
pnpm install
ACCOUNTS_FILE_PATH=/path/to/accounts.txt \
TWITTER_ALLOW_DIRECT=1 \
TWITTER_BROWSER_HEADLESS=1 \
pnpm --filter twitter-gateway start
```

The account format is shared with `scraper-manzana`:

```text
username:password:email:emailPassword:authToken:twoFactorSecret
```

Set `ACCOUNTS_FILE_FORMAT` if the columns differ. The service runs multiple
accounts concurrently and rotates work across them.
Five-column files with a 40-character auth token in column four are detected
automatically as `username:password:email:authToken:emailPassword`.
When Twitter returns HTTP 429, that account is drained, closed, and cooled down
for 15 minutes (`ACCOUNT_RATE_LIMIT_COOLDOWN_MS`) while requests retry on the
next available account.

Account contexts share one Chromium process while keeping cookies and pages
isolated. `ACCOUNT_MAX_ACTIVE_SESSIONS` controls the number of live account
contexts (default `1` to fit the production 2 GB host), and
`ACCOUNT_CONCURRENCY` controls simultaneous raw X requests per account (default
`8`). To prevent cold-start memory spikes,
`ACCOUNT_BOOTSTRAP_CONCURRENCY` limits simultaneous frontend setup to one
account by default; warm accounts still run concurrently.

Proxy and browser settings are the same as `scraper-manzana`, including
`PROXY_URL`, `WEBSHARE_PROXY_LIST_URL`, `TWITTER_BROWSER_EXECUTABLE_PATH`, and
`TWITTER_BROWSER_HEADLESS`. Proxy lists are downloaded once per process and
assigned deterministically by account position instead of sending every
account through the first proxy.

GraphQL templates and transaction-solver source data are discovered once per
process and shared across account contexts. Gateway calls use raw `undici`
requests with a fresh browser-generated `x-client-transaction-id`; they do not
reload the X frontend. `SearchTimeline` uses X's current mixed POST shape
(variables in the URL; features and query ID in the JSON body). Because X can
occasionally bootstrap a transaction key that strict endpoints reject with an
empty HTTP 404, Search automatically rebuilds the transaction solver up to
three times before rotating accounts.

Compatibility references worth checking when X changes its wire format:

- [gobird wire protocol](https://github.com/mudrii/gobird/blob/main/docs/wire-protocol.md)
- [Twikit transaction parser fix](https://github.com/d60/twikit/pull/410)
- [twscrape](https://github.com/vladkens/twscrape)
- [twitter-scraper](https://github.com/the-convocation/twitter-scraper)

Every raw X GraphQL request is recorded in SQLite with its timestamp, method,
path, operation, status, duration, account, and error. The default database is
`twitter-gateway.sqlite`; override it with `SQLITE_PATH`. The public index page
shows total requests, requests in the last 30 minutes, failures, and the most
recent status.

## Deploy

The production host can be updated from the repository root with:

```sh
pnpm --filter twitter-gateway deploy
```

Override `DEPLOY_HOST` or `DEPLOY_USER` when needed. The command synchronizes
the repository to `/opt/milei-twitter`, installs dependencies and Chromium,
and restarts `twitter-gateway.service`. It preserves API users, Twitter
accounts, SQLite data, and environment configuration under `/etc/twitter-gateway`
and `/var/lib/twitter-gateway`.
