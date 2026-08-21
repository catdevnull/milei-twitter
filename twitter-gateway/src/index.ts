import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  closeSharedTwitterBrowser,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";
import { AccountPool, AllAccountsRateLimitedError } from "./account-pool.ts";
import { apiAuth } from "./auth.ts";
import { RequestDatabase } from "./database.ts";
import { TwitterGateway, TwitterUserNotFoundError } from "./gateway.ts";

const app = new Hono();
const requests = new RequestDatabase();
const accountPool = new AccountPool((event) => requests.record(event));
const gateway = new TwitterGateway(accountPool);

function required(value: string | undefined, name: string) {
  if (!value) {
    throw new HTTPException(422, {
      message: `Missing required parameter: ${name}`,
    });
  }
  return value;
}

function userId(value: string | undefined) {
  const id = required(value, "user_id");
  if (!/^\d+$/.test(id)) {
    throw new HTTPException(422, {
      message: "user_id must be a numeric Twitter ID",
    });
  }
  return id;
}

app.get("/", (c) => {
  const stats = requests.stats();
  const lastRequest = stats.lastRequestAt
    ? new Date(stats.lastRequestAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : "Never";
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>twitter-gateway</title>
    <style>
      body { max-width: 820px; margin: 4rem auto; padding: 0 1.25rem; font: 16px/1.55 system-ui, sans-serif; color: #17202a; }
      h1 { margin-bottom: .25rem; } code { background: #f3f5f7; padding: .15rem .35rem; border-radius: .25rem; }
      li { margin: .65rem 0; } .note { color: #536471; }
      .status { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; margin: 1.5rem 0; }
      .card { border: 1px solid #dfe3e6; border-radius: .6rem; padding: .9rem 1rem; }
      .value { display: block; font-size: 1.7rem; font-weight: 700; }
      .label { color: #536471; font-size: .85rem; }
      .online { color: #16833b; }
    </style>
  </head>
  <body>
    <h1>twitter-gateway</h1>
    <p class="note">A small SocialAPI-compatible HTTP API backed by logged-in Twitter browser sessions and raw X requests.</p>
    <div class="status">
      <div class="card"><span class="value online">Online</span><span class="label">Service status</span></div>
      <div class="card"><span class="value">${stats.total}</span><span class="label">Total X requests</span></div>
      <div class="card"><span class="value">${stats.lastThirtyMinutes}</span><span class="label">X requests, last 30 min</span></div>
      <div class="card"><span class="value">${stats.failed}</span><span class="label">Failed X requests</span></div>
    </div>
    <p class="note">Last X request: ${lastRequest}${stats.lastStatus ? ` · HTTP ${stats.lastStatus}` : ""}</p>
    <h2>Endpoints</h2>
    <ul>
      <li><code>GET /twitter/search?query=…&amp;type=Latest|Top&amp;cursor=…</code></li>
      <li><code>GET /twitter/user/:user_id_or_username</code></li>
      <li><code>GET /twitter/followers/list?user_id=…&amp;cursor=…</code></li>
      <li><code>GET /twitter/friends/list?user_id=…&amp;cursor=…</code></li>
      <li><code>GET /twitter/user/:user_id/tweets?cursor=…</code></li>
      <li><code>GET /twitter/user/:user_id/tweets-and-replies?cursor=…</code></li>
      <li><code>GET /twitter/accounts/status</code></li>
    </ul>
    <p>Pagination cursors are returned as <code>next_cursor</code>. Tweet and user objects include the original GraphQL result under <code>raw_twitter</code>.</p>
    <p>Twitter routes require <code>Authorization: Bearer YOUR_API_KEY</code>. <a href="/health">Health check</a>.</p>
  </body>
</html>`);
});

app.get("/health", (c) => c.json({ ok: true }));

app.use("/twitter/*", apiAuth);

app.get("/twitter/accounts/status", async (c) =>
  c.json(await accountPool.status()),
);

app.get("/twitter/search", async (c) => {
  const query = required(c.req.query("query"), "query");
  const requestedType = c.req.query("type") ?? "Latest";
  if (requestedType !== "Latest" && requestedType !== "Top") {
    throw new HTTPException(422, { message: "type must be Latest or Top" });
  }
  return c.json(
    await gateway.search(query, requestedType, c.req.query("cursor")),
  );
});

app.get("/twitter/followers/list", async (c) =>
  c.json(
    await gateway.followers(
      userId(c.req.query("user_id")),
      c.req.query("cursor"),
    ),
  ),
);

app.get("/twitter/friends/list", async (c) =>
  c.json(
    await gateway.followings(
      userId(c.req.query("user_id")),
      c.req.query("cursor"),
    ),
  ),
);

app.get("/twitter/user/:userId/tweets", async (c) =>
  c.json(
    await gateway.tweets(
      userId(c.req.param("userId")),
      false,
      c.req.query("cursor"),
    ),
  ),
);

app.get("/twitter/user/:userId/tweets-and-replies", async (c) =>
  c.json(
    await gateway.tweets(
      userId(c.req.param("userId")),
      true,
      c.req.query("cursor"),
    ),
  ),
);

app.get("/twitter/user/:identifier", async (c) =>
  c.json(
    await gateway.profile(required(c.req.param("identifier"), "identifier")),
  ),
);

app.onError((error, c) => {
  console.error(error);
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  if (error instanceof TwitterUserNotFoundError) {
    return c.json({ error: error.message }, 404);
  }
  if (error instanceof AllAccountsRateLimitedError) {
    // X's reset timestamps and the gateway clock can differ by a few seconds.
    // Retrying on the exact boundary can renew a sliding rate-limit window.
    const retrySafetySeconds = 10;
    const retryAfter = Math.max(
      1,
      Math.ceil((error.retryAt - Date.now()) / 1000) + retrySafetySeconds,
    );
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: error.message, retry_after: retryAfter }, 503);
  }
  if (error instanceof TwitterApiError) {
    return c.json(
      { error: "Twitter request failed", twitter_status: error.status },
      error.status === 404 ? 404 : 502,
    );
  }
  return c.json(
    { error: error instanceof Error ? error.message : "Internal error" },
    500,
  );
});

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";
const server = serve({ fetch: app.fetch, hostname, port }, (info) => {
  console.info(`[twitter-gateway] listening on http://localhost:${info.port}`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[twitter-gateway] ${signal}; shutting down`);
  server.close();
  (
    server as typeof server & { closeAllConnections?: () => void }
  ).closeAllConnections?.();
  await closeSharedTwitterBrowser().catch((error) => {
    console.error("[twitter-gateway] could not close shared browser", error);
  });
  requests.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

export { app };
