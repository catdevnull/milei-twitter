import { z } from "zod";
import { sendScrapToApi } from "./dbs/scraps/index.ts";
import {
  notifyTelegram,
  scrapNewTweetsWithFallback,
} from "./scraper.ts";

const zLastTweetIds = z.array(z.string());

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ""}`.trim();
  }
  return String(error);
}

async function fetchLastTweetIds(apiUrl: string) {
  const response = await fetch(`${apiUrl}/api/internal/scraper/last-ids`);
  if (!response.ok) {
    throw new Error(
      `Could not fetch last tweet ids: ${response.status} ${await response.text()}`,
    );
  }
  return zLastTweetIds.parse(await response.json());
}

export async function runCronOnce() {
  const apiToken = process.env.API_TOKEN;
  if (!apiToken) throw new Error("Missing API_TOKEN");

  const apiUrl = process.env.API_URL ?? "https://milei.nulo.lol";
  const lastTweetIds = await fetchLastTweetIds(apiUrl);
  const scrap = await scrapNewTweetsWithFallback(lastTweetIds);

  if (scrap.tweets?.length === 0) {
    throw new Error("No tweets found");
  }

  const res = await sendScrapToApi(JSON.stringify(scrap), apiToken);
  console.info(`[cron] saved scrap into ${res.scrapId}`);
}

runCronOnce().catch(async (error) => {
  console.error("[cron] failed", error);
  await notifyTelegram(
    ["milei-twitter cron failed.", errorMessage(error)].join("\n\n"),
  );
  process.exitCode = 1;
});
