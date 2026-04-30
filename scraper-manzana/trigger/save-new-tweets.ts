import { logger, schedules } from "@trigger.dev/sdk";
import { z } from "zod";
import { sendScrapToApi } from "../dbs/scraps/index.ts";
import { scrapNewTweetsWithFallback } from "../scraper.ts";

const zLastTweetIds = z.array(z.string());

export const saveNewTweetsTask = schedules.task({
  id: "save-new-tweets",
  //every half an hour
  cron: "*/30 * * * *",
  run: async (payload, { ctx }) => {
    const API_TOKEN = process.env.API_TOKEN;
    if (!API_TOKEN) throw new Error("Missing API_TOKEN");
    const API_URL = process.env.API_URL ?? "https://milei.nulo.lol";

    const lastTweetIds = zLastTweetIds.parse(
      await (await fetch(`${API_URL}/api/internal/scraper/last-ids`)).json()
    );
    const scrap = await scrapNewTweetsWithFallback(lastTweetIds);
    if (scrap.tweets?.length === 0) {
      throw new Error("No tweets found");
    }
    const res = await sendScrapToApi(JSON.stringify(scrap), API_TOKEN);
    logger.info(`Saved into ${res.scrapId}`);
  },
});
