# twitter-gateway

A small Hono service that mirrors the requested SocialAPI routes using the
repository's existing Playwright Twitter scraper. It runs on Node through
`tsx`, requires no inbound API authentication, and includes the raw Twitter
GraphQL result as `raw_twitter` on returned tweets and users.

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

Set `ACCOUNTS_FILE_FORMAT` if the columns differ. The service keeps using the
current account until Twitter rate-limits it, then rotates to the next account.
Five-column files with a 40-character auth token in column four are detected
automatically as `username:password:email:authToken:emailPassword`.
When Twitter returns HTTP 429, that account is closed and cooled down for 15
minutes (`ACCOUNT_RATE_LIMIT_COOLDOWN_MS`) while the request retries on the next
available account.

Proxy and browser settings are the same as `scraper-manzana`, including
`PROXY_URL`, `WEBSHARE_PROXY_LIST_URL`, `TWITTER_BROWSER_EXECUTABLE_PATH`, and
`TWITTER_BROWSER_HEADLESS`.

Each browser/account session captures an operation's current GraphQL template
once and caches it. Subsequent gateway calls use raw `undici` requests with a
fresh browser-generated `x-client-transaction-id`; they do not reload the X
frontend.
