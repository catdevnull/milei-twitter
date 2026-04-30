import "dotenv/config";
import { scrapNewTweetsWithBrowser } from "./browser-twitter/scraper.ts";

async function main() {
  const scrap = await scrapNewTweetsWithBrowser([]);
  console.info(
    JSON.stringify(
      {
        tweets: scrap.tweets?.length ?? 0,
        retweets: scrap.retweets?.length ?? 0,
        firstTweetId: scrap.tweets?.[0]?.id,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
