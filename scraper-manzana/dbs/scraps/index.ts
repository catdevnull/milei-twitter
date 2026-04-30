import { zPostScrapRes } from "api/schema.ts";
import "dotenv/config";

const API_URL = process.env.API_URL ?? "https://milei.nulo.lol";
console.info(`API_URL=${API_URL}`);
if (!process.env.API_TOKEN) console.error("Missing API_TOKEN");

export async function sendScrapToApi(scrapJson: string, token: string) {
  const res = await fetch(`${API_URL}/api/internal/scraper/scrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: scrapJson,
  });
  if (!res.ok) {
    throw new Error(`HTTP status response: ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return zPostScrapRes.parse(json);
}
