import { scrapNewTweets as scrapNewTweetsWithGateway } from "./twitter-gateway/scraper.ts";
import { scrapNewTweets as scrapNewTweetsWithSocialdata } from "./socialdata/scraper.ts";
import { fetch } from "undici";
import pRetry from "p-retry";
import type { Scrap } from "api/schema.ts";

const MIN_TWEETS_PER_SCRAPE = 10;
const GATEWAY_SCRAPER_RETRIES = 1;

function errorMessage(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function envNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsed;
}

function truncateTelegramMessage(message: string) {
  const maxLength = 3900;
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength)}\n\n[truncated]`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms).unref();
    }),
  ]);
}

function assertEnoughTweets(scrap: Scrap, source: string) {
  const tweetsSeen = scrap.totalTweetsSeen ?? scrap.tweets?.length ?? 0;
  if (tweetsSeen < MIN_TWEETS_PER_SCRAPE) {
    throw new Error(
      `${source} returned ${tweetsSeen} tweets (<${MIN_TWEETS_PER_SCRAPE})`,
    );
  }
  return scrap;
}

async function scrapNewTweetsWithGatewayRetries(
  lastIds: string[],
  timeoutMs: number,
) {
  return await pRetry(
    async (attempt) => {
      const scrap = await withTimeout(
        scrapNewTweetsWithGateway(lastIds),
        timeoutMs,
        `Twitter gateway attempt ${attempt}`,
      );
      return assertEnoughTweets(scrap, `Twitter gateway attempt ${attempt}`);
    },
    {
      retries: GATEWAY_SCRAPER_RETRIES,
      onFailedAttempt: (error) => {
        console.warn(
          `[cron] Twitter gateway attempt ${error.attemptNumber} failed; retrying`,
          error,
        );
      },
    },
  );
}

export async function notifyTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("[notify] missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: truncateTelegramMessage(message),
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    console.error(
      `[notify] telegram send failed: ${response.status} ${await response.text()}`,
    );
  }
}

export async function scrapNewTweetsWithFallback(lastIds: string[]) {
  try {
    const gatewayTimeoutMs =
      envNumber("TWITTER_GATEWAY_TIMEOUT_MS") ?? 5 * 60 * 1000;
    return await scrapNewTweetsWithGatewayRetries(lastIds, gatewayTimeoutMs);
  } catch (gatewayError) {
    console.error("[cron] Twitter gateway failed", gatewayError);
    await notifyTelegram(
      [
        "milei-twitter gateway failed; falling back to SocialAPI.",
        errorMessage(gatewayError),
      ].join("\n\n"),
    );

    try {
      return assertEnoughTweets(
        await scrapNewTweetsWithSocialdata(lastIds),
        "SocialData fallback",
      );
    } catch (socialdataError) {
      throw new AggregateError(
        [gatewayError, socialdataError],
        [
          "Both tweet sources failed.",
          `Gateway: ${errorMessage(gatewayError)}`,
          `SocialAPI: ${errorMessage(socialdataError)}`,
        ].join("\n"),
      );
    }
  }
}
