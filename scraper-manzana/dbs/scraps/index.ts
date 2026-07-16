import { zPostScrapRes } from "api/schema.ts";
import "dotenv/config";
import pRetry from "p-retry";

const API_URL = process.env.API_URL ?? "https://milei.nulo.lol";
console.info(`API_URL=${API_URL}`);
if (!process.env.API_TOKEN) console.error("Missing API_TOKEN");

class ScrapApiError extends Error {
  constructor(
    readonly status: number,
    responseBody: string,
  ) {
    super(`HTTP status response: ${status}: ${responseBody}`);
  }
}

function isTransientStatus(status: number) {
  return [408, 425, 429].includes(status) || status >= 500;
}

export async function sendScrapToApi(scrapJson: string, token: string) {
  return await pRetry(
    async () => {
      const res = await fetch(`${API_URL}/api/internal/scraper/scrap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: scrapJson,
      });
      if (!res.ok) {
        throw new ScrapApiError(res.status, await res.text());
      }
      return zPostScrapRes.parse(await res.json());
    },
    {
      retries: 3,
      minTimeout: 1_000,
      maxTimeout: 5_000,
      shouldRetry: ({ error }) =>
        !(error instanceof ScrapApiError) || isTransientStatus(error.status),
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        if (
          error instanceof ScrapApiError &&
          !isTransientStatus(error.status)
        ) {
          return;
        }
        console.warn(
          `[cron] save attempt ${attemptNumber} failed; ${retriesLeft} retries left`,
          error,
        );
      },
    },
  );
}
