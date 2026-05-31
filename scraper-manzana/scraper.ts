import { scrapNewTweetsWithBrowser } from "./browser-twitter/scraper.ts";
import { scrapNewTweets as scrapNewTweetsWithSocialdata } from "./socialdata/scraper.ts";
import { fetch } from "undici";

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

export async function notifyTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("[notify] missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncateTelegramMessage(message),
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    console.error(
      `[notify] telegram send failed: ${response.status} ${await response.text()}`
    );
  }
}

export async function scrapNewTweetsWithFallback(lastIds: string[]) {
  try {
    const browserTimeoutMs =
      envNumber("BROWSER_SCRAPER_TIMEOUT_MS") ?? 5 * 60 * 1000;
    const scrap = await withTimeout(
      scrapNewTweetsWithBrowser(lastIds),
      browserTimeoutMs,
      "Browser scraper",
    );
    if (scrap.tweets?.length === 0) {
      throw new Error("Browser scraper returned no tweets");
    }
    return scrap;
  } catch (browserError) {
    console.error("[cron] browser scraper failed", browserError);
    await notifyTelegram(
      [
        "milei-twitter browser scraper failed; falling back to SocialData.",
        errorMessage(browserError),
      ].join("\n\n")
    );

    try {
      return await scrapNewTweetsWithSocialdata(lastIds);
    } catch (socialdataError) {
      await notifyTelegram(
        [
          "milei-twitter SocialData fallback also failed.",
          errorMessage(socialdataError),
        ].join("\n\n")
      );
      throw socialdataError;
    }
  }
}
