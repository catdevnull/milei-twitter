import { logger, schedules } from "@trigger.dev/sdk/v3";
import { scrapNewTweets } from "../socialdata/scraper.ts";
import { sendScrapToApi } from "../dbs/scraps/index.ts";

export const saveNewTweetsTask = schedules.task({
  id: "save-new-tweets",
  //every half an hour
  cron: "*/30 * * * *",
  run: async (payload, { ctx }) => {
    const API_TOKEN = process.env.API_TOKEN;
    if (!API_TOKEN) throw new Error("Missing API_TOKEN");
    const API_URL = process.env.API_URL ?? "https://milei.nulo.in";

    const lastTweetIds: string[] = await (
      await fetch(`${API_URL}/api/internal/scraper/last-ids`)
    ).json();
    const scrap = await scrapNewTweets(lastTweetIds);
    if (scrap.tweets?.length === 0) {
      throw new Error("No tweets found");
    }
    const res = await sendScrapToApi(JSON.stringify(scrap), API_TOKEN);
    logger.info(`Saved into ${res.scrapId}`);
  },
});
