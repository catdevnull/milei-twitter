import { Scraper, Tweet } from "@catdevnull/twitter-scraper";
import DataLoader from "dataloader";
import OpenAI from "openai";
import { getAllTweetsEver } from "./scraper.ts";

async function runPrompt(openai: OpenAI, prompt: string) {
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "anthropic/claude-3-haiku:beta",
    // temperature: 1,
    // max_tokens: 1024,
    // top_p: 1,
    // stream: false,
    // stop: null,
  });
  if (!chatCompletion.choices || chatCompletion.choices.length == 0) {
    console.error(chatCompletion);
  }
  try {
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    return await runPrompt(openai, prompt);
  }
}

export async function contradictionCarpeteo(
  scraper: Scraper,
  openai: OpenAI,
  tweetId: string
) {
  const originalTweet = await scraper.getTweet(tweetId);
  if (!originalTweet) {
    console.error("no hay tweet");
    process.exit(1);
  }
  console.info(
    `carpeteando "${originalTweet.text}" de @${originalTweet.username}`
  );
  const IsCarpetazoDataloader = new DataLoader(
    async (tweets: readonly Tweet[]) => {
      const response = await runPrompt(
        openai,
        `considering the original tweet from user "@${originalTweet.username}": ` +
          originalTweet
            .text!.split("\n")
            .map((l) => `> ${l}`)
            .join("\n") +
          // '""\n\n¿cual de los siguientes tweets se podrían considerar contradictorios al original?\n' +
          "\n\nwhich of the following tweets by the same user can be considered contradictory to the original tweet?\n" +
          tweets
            .map(
              (t) =>
                `- ID ${t.id!}: ${t.quotedStatus ? `(citing a tweet by @${t.quotedStatus.username!}: """${t.quotedStatus.text!}""")` : ""} """${t.text!}"""`
            )
            .join("\n") +
          // "\n\nsolo contesta con UNA (singular) ID y nada más. no expliques tu respuesta. si ninguno de los tweets es suficientemente contradictorio, contesta con 'null'.",
          "\n\nreply with ONE TWEET ID and a brief explanation. if none of the tweets are contradictory or are unrelated to the original tweet, reply with just 'null'."
      );

      console.log(response);

      const matchNumber = response?.match(/\d+/);
      if (matchNumber) {
        console.log(`--> https://x.com/i/status/${matchNumber[1]}`);
      }

      return tweets.map((t) => false);
    },
    {
      batchScheduleFn: (callback) => setTimeout(callback, 2500),
      maxBatchSize: 50,
    }
  );
  for await (const tweet of getAllTweetsEver(
    scraper,
    originalTweet.username!
  )) {
    if (!tweet.text || tweet.text.length < 25) continue;
    IsCarpetazoDataloader.load(tweet);
  }
}

export async function sjwCarpeteo(
  scraper: Scraper,
  openai: OpenAI,
  username: string
) {
  console.info(`carpeteando sjw @${username}`);
  const IsCarpetazoDataloader = new DataLoader(
    async (tweets: readonly Tweet[]) => {
      const response = await runPrompt(
        openai,
        `which of the following tweets from user "@${username}" are either homophobic, transphobic, misogynistic, ableist or antisemitic?\n` +
          tweets
            .map(
              (t) =>
                `- ID ${t.id!}: ${t.quotedStatus ? `(citing a tweet by @${t.quotedStatus.username!}: """${t.quotedStatus.text!}""")` : ""} """${t.text!}"""`
            )
            .join("\n") +
          // "\n\nsolo contesta con UNA (singular) ID y nada más. no expliques tu respuesta. si ninguno de los tweets es suficientemente contradictorio, contesta con 'null'.",
          `\n\nreply with a list of TWEET IDs and a brief explanation. do not mention any IDs if they don't qualify. do NOT include content that is just insulting; only include homophobic, transphobic, misogynistic or antisemitic tweets.`
      );

      const matchNumber = response?.match(/\d+/g);
      if (matchNumber) {
        console.log(response);
        for (const id of matchNumber) {
          if (id.length > 8) console.log(`--> https://x.com/i/status/${id}`);
        }
      }

      return tweets.map((t) => false);
    },
    {
      batchScheduleFn: (callback) => setTimeout(callback, 2500),
      maxBatchSize: 50,
    }
  );
  for await (const tweet of getAllTweetsEver(scraper, username)) {
    if (!tweet.text || tweet.text.length < 25) continue;
    IsCarpetazoDataloader.load(tweet);
  }
}
