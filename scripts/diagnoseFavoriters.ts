#!/usr/bin/env node
// Diagnostic: navigate to a tweet's likes tab with one real session and log
// every GraphQL operation the page fires, so we can see what X calls the
// "Favoriters" operation today. Prints only operation names — no credentials.

import { readFile } from "node:fs/promises";
import {
  BrowserTwitterSession,
  type TwitterApiRequestEvent,
} from "scraper-manzana/browser-twitter";
import { parseAccountList } from "scraper-manzana/accounts";

const tweetId = process.argv[2] ?? "2094911633097175052";
const accountIndex = Number(process.argv[3] ?? "0");
const watchMs = Number(process.argv[4] ?? "40000");

async function main() {
const source = await readFile(
  process.env.ACCOUNTS_FILE_PATH ?? "/etc/twitter-gateway/accounts.txt",
  "utf8",
);
const accounts = source
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#"));
const accountsParsed = accounts.flatMap((line) => {
  const fields = line.split(":");
  if (
    fields.length === 6 &&
    /^[0-9a-f]{160}$/i.test(fields[4] ?? "") &&
    /^[0-9a-f]{40}$/i.test(fields[5] ?? "")
  ) {
    return parseAccountList(
      line,
      "username:password:email:twoFactorSecret:csrfToken:authToken",
    );
  }
  if (fields.length === 5 && /^[0-9a-f]{40}$/i.test(fields[3] ?? "")) {
    return parseAccountList(line, "username:password:email:authToken:emailPassword");
  }
  if (fields.length === 5) {
    return parseAccountList(line, "username:password:email:emailPassword:authToken");
  }
  return [];
});
const account = accountsParsed[accountIndex];
if (!account) throw new Error(`No account at index ${accountIndex}`);
const fields = accounts[accountIndex]!.split(":");
console.log(
  `account idx=${accountIndex} nf=${fields.length} ` +
    `username=${fields[0] != null} password=${fields[1] != null} ` +
    `email=${fields[2] != null} f4=${fields[3] != null} f5=${fields[4] != null} f6=${fields[5] != null}`,
);
console.log(
  `parsed: username=${account.username != null} password=${account.password != null} authToken=${account.authToken != null}`,
);

console.log(`bootstrapping session for account index=${accountIndex}`);
const seen: Array<{ operation: string; status?: number; path: string }> = [];
const session = await BrowserTwitterSession.create({
  account,
  onApiRequest: (event: TwitterApiRequestEvent) => {
    if (!event.path.includes("/i/api/graphql/")) return;
    if (seen.some((entry) => entry.operation === event.operation)) return;
    seen.push({ operation: event.operation, status: event.status, path: event.path });
    console.log(`graphql status=${event.status ?? "-"} ${event.operation}`);
  },
});
console.log("session ready");

const paths = [
  `https://x.com/JMilei/status/${tweetId}`,
];
for (const path of paths) {
  console.log(`navigating ${path}`);
  try {
    await session["page"].goto(path, { waitUntil: "domcontentloaded" });
  } catch (error) {
    console.log(`goto error: ${error}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 8_000));
  const page = session["page"];
  console.log(`page url now: ${page.url()}`);
  const bodyText = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  console.log(`body text (first 400): ${bodyText.slice(0, 400).replace(/\n/g, " | ")}`);
  const likeLinks = await page
    .locator('a[href*="/likes"]')
    .count()
    .catch(() => -1);
  console.log(`a[href*="/likes"] count: ${likeLinks}`);
  const candidates = await page
    .locator('article button[data-testid="like"]')
    .first()
    .evaluate((element) => element.outerHTML.slice(0, 2000))
    .catch((error) => String(error).slice(0, 200));
  console.log(`like button html: ${candidates}`);
  const tabs = await page
    .locator('[data-testid="ScrollSnap-List"] a')
    .evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute("href"),
        text: link.textContent?.slice(0, 40) ?? "",
        testid: link.getAttribute("data-testid"),
      })),
    )
    .catch(() => []);
  console.log(`tab links: ${JSON.stringify(tabs)}`);
  await page.screenshot({ path: "/tmp/diag-likes.png", timeout: 5_000 }).catch(() => {});
  for (const selector of [
    'a[href$="/likes"]:visible',
    '[data-testid="ScrollSnap-List"] a[href*="/likes"]',
  ]) {
    try {
      const tab = page.locator(selector).first();
      if (await tab.isVisible()) {
        console.log(`clicking likes tab via ${selector}`);
        await tab.click({ timeout: 5_000 });
        break;
      }
    } catch (error) {
      console.log(`click ${selector} failed: ${String(error).slice(0, 120)}`);
    }
  }
  const page2 = session["page"];
  const target = new URL(page2.url()).pathname;
  console.log("client-side navigating to", `${target}/likes`);
  await page2
    .evaluate((path) => {
      const anchor = document.createElement("a");
      anchor.href = path;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }, `${target}/likes`)
    .catch((error) => console.log(`evaluate failed: ${error}`));
  await new Promise((resolve) => setTimeout(resolve, 6_000));
  console.log(`page url after spa nav: ${page2.url()}`);
  const dialogText = await page2
    .locator('[data-testid="DialogContent"], [role="dialog"]')
    .first()
    .innerText()
    .catch(() => "");
  console.log(`dialog text (first 200): ${dialogText.slice(0, 200).replace(/\n/g, " | ")}`);
  await new Promise((resolve) => setTimeout(resolve, watchMs / paths.length));
}

console.log("operations seen:");
for (const { operation, status } of seen.sort((a, b) =>
  a.operation.localeCompare(b.operation),
)) {
  console.log(`  status=${status ?? "-"} ${operation}`);
}
await session.close().catch(() => {});
process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
