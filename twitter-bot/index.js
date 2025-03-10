import OAuth from "oauth";
import { z } from "zod";

import dayjs from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat.js";
import Utc from "dayjs/plugin/utc.js";
import Tz from "dayjs/plugin/timezone.js";
import { didPostTodayAlready, justPosted } from "./db.js";
dayjs.extend(CustomParseFormat);
dayjs.extend(Utc);
dayjs.extend(Tz);
import { parsearLinkDeTwitter } from "../common/parsearLinkDeTwitter.js";
import { dogsAccounts } from "./consts.js";

// #region Twitter API
/**
 * @typedef TwitterBotAuth
 * @property {(args: { text: string }) => Promise<void>} sendTweet
 */

/** @implements {TwitterBotAuth} */
class TwitterBotAuthReal {
  constructor() {
    this.cfg = z
      .object({
        OAUTH_CONSUMER_KEY: z.string(),
        OAUTH_CONSUMER_SECRET: z.string(),
        OAUTH_TOKEN_KEY: z.string(),
        OAUTH_TOKEN_SECRET: z.string(),
      })
      .parse(process.env);

    this.oauth = new OAuth.OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      this.cfg.OAUTH_CONSUMER_KEY,
      this.cfg.OAUTH_CONSUMER_SECRET,
      "1.0",
      null,
      "HMAC-SHA1"
    );
  }

  /**
   * @param {{ url: string; method: string; }} req
   */
  authorizationHeader(req) {
    return this.oauth.authHeader(
      req.url,
      this.cfg.OAUTH_TOKEN_KEY,
      this.cfg.OAUTH_TOKEN_SECRET,
      req.method
    );
  }

  /**
   * @param {{ text: string }} tweet
   */
  async sendTweet({ text }) {
    console.log("Posting", { text });
    const req = new Request("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    req.headers.set("Authorization", this.authorizationHeader(req));

    const res = await fetch(req);
    const json = await res.json();
    console.log(json);
  }
}
/** @implements {TwitterBotAuth} */
class TwitterBotAuthFake {
  /**
   * @param {{ text: string; }} msg
   */
  async sendTweet(msg) {
    console.debug("[sendTweet]", msg);
  }
}

// #region milei.n API
class MileiTwitter {
  static v1Schema = z.object({
    hoy: z.object({
      likes: z.number(),
      retweets: z.number(),
      totalTime: z.number(),
    }),
    ultimaSemana: z.array(
      z.object({
        day: z.string(),
        tweets: z.number(),
        retweets: z.number(),
        screenTime: z.number(),
      })
    ),
    last12hTweets: z.array(
      z.object({
        firstSeenAt: z.coerce.date(),
        url: z.string(),
        text: z.string().nullable(),
      })
    ),
  });
  /** @typedef {z.infer<typeof this.v1Schema>} V1 */

  static get endpoint() {
    return process.env.ENDPOINT ?? "https://milei.nulo.lol";
  }

  static async getData() {
    const res = await fetch(`${this.endpoint}/api/internal/qhacemileibot/v1`);
    const json = await res.json();
    return this.v1Schema.parse(json);
  }
}

// #region k:high-activity-last-4h
/**
 * @param {TwitterBotAuth} auth
 * @param {V1} data
 */
async function loopHighActivityLast4h(auth, data) {
  const kind = "high-activity-day-last-4h";
  if (await didPostTodayAlready(kind)) return false;
  const last4hTweets = data.last12hTweets.filter(
    (t) => t.firstSeenAt > dayjs().subtract(4, "hour").toDate()
  );
  if (last4hTweets.length < 135) return false;

  const nLiked = last4hTweets.length;

  const userCounts = last4hTweets
    .map((t) => {
      const link = parsearLinkDeTwitter(t.url);
      if (!link || "error" in link || !("username" in link) || !link.username)
        throw false;
      return link.username;
    })
    .reduce((prev, curr) => {
      prev.set(curr, (prev.get(curr) ?? 0) + 1);
      return prev;
    }, new Map());

  const taggearTopLikeados = process.env.TAGGEAR_TOP_LIKEADOS === "true";
  const tag = taggearTopLikeados ? "@" : "@/";

  await auth.sendTweet({
    text: [
      "🪑🪑🪑 SILLAZO 🪑🪑🪑",
      `¡Milei no puede soltar el celular!`,
      `Habría likeado ${nLiked} tweets en las últimas 4 horas.`,
      `Top 3 más likeados:`,
      ...[...userCounts.entries()]
        .sort(([, n1], [, n2]) => n2 - n1)
        .slice(0, 3)
        .map(
          ([username, n], index) => `${index + 1}: ${tag}${username} (${n}🩷)`
        ),
    ].join("\n"),
  });
  await justPosted(kind);
}

// #region k:dogs
/**
 * @param {TwitterBotAuth} auth
 * @param {V1} data
 */
async function loopHighActivityDogs(auth, data) {
  const kind = "high-activity-day-dogs";
  if (await didPostTodayAlready(kind)) return false;
  const last12hTweetsDogs = data.last12hTweets.filter((t) => {
    const link = parsearLinkDeTwitter(t.url);
    if (link && "username" in link && link.username) {
      return dogsAccounts.includes(link.username);
    }
    return false;
  });
  if (last12hTweetsDogs.length < 30) return false;

  const nLiked = last12hTweetsDogs.length;

  await auth.sendTweet({
    text:
      "🐶🐶 EXTRAÑA A CONAN 🐶🐶\n" +
      `Habría likeado ${nLiked} tweets de fotos de perros en las últimas 12 horas.\n` +
      "Conan está muerto.",
  });
  await justPosted(kind);
}

// #region loop
/**
 * @param {TwitterBotAuth} auth
 */
async function loopCycle(auth) {
  const data = await MileiTwitter.getData();
  await loopHighActivityLast4h(auth, data);
  await loopHighActivityDogs(auth, data);
}

async function loop() {
  const auth = new TwitterBotAuthReal();
  try {
    await loopCycle(auth);
    await new Promise((resolve) => setTimeout(resolve, 45 * 60 * 1000));
  } catch (error) {
    console.error(`Error en loop`, error);
    await new Promise((resolve) => setTimeout(resolve, 2 * 1000));
  }
}

if (process.argv[2] === "debug") {
  await loopCycle(new TwitterBotAuthFake());
} else {
  await loop();
}
