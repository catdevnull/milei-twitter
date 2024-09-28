import {
  boolean,
  command,
  flag,
  oneOf,
  option,
  positional,
  run,
  string,
  subcommands,
} from "cmd-ts";
import {
  cron,
  newScraper,
  printAllTweetsEver,
  printFollowing,
  printLastLikes,
  printLastTweets,
  saveLikes,
  saveTweetsAndRetweets,
} from "./scraper.ts";
import OpenAI from "openai";
import { contradictionCarpeteo, sjwCarpeteo } from "./carpeteo.ts";
import { db } from "./dbs/scraps/index.ts";
import {
  getTweet,
  getTweetsAndRepliesIterator,
  intoTwitterScraperTweet,
  cron as cronSocialdata,
} from "./socialdata/scraper.ts";

const printLikesCmd = command({
  name: "print last likes",
  args: {},
  handler() {
    printLastLikes();
  },
});

const saveLikesCmd = command({
  name: "save last likes",
  args: {},
  async handler() {
    const scraper = await newScraper();
    saveLikes(scraper);
  },
});

const printTweetsCmd = command({
  name: "print last tweets",
  args: {},
  handler() {
    printLastTweets();
  },
});

const printAllTweetsEverCmd = command({
  name: "print all tweets ever (without retweets) without sorting in jsonl",
  args: {
    username: option({
      type: string,
      long: "username",
      defaultValue: () => "jmilei",
      description: "username of user to scrap all tweets of",
    }),
  },
  handler(args) {
    printAllTweetsEver(args.username);
  },
});

const saveTweetsAndRetweetsCmd = command({
  name: "save last tweets and retweets",
  args: {},
  async handler() {
    const scraper = await newScraper();
    saveTweetsAndRetweets(scraper);
  },
});

const printFollowingCmd = command({
  name: "print accounts user is following",
  args: {
    userHandle: positional({ type: string, displayName: "user handle" }),
    jsonl: flag({
      type: boolean,
      short: "j",
      long: "jsonl",
      defaultValue: () => false,
    }),
  },
  handler(args) {
    printFollowing(args.userHandle, args.jsonl);
  },
});

const cronCmd = command({
  name: "cron",
  args: {},
  handler() {
    cron();
  },
});

const cronSocialdataCmd = command({
  name: "cron-socialdata",
  args: {},
  handler() {
    cronSocialdata();
  },
});

const carpetearCmd = command({
  name: "carpetear",
  args: {
    param: positional({
      type: string,
      displayName: "param",
    }),
    prompt: option({
      type: oneOf(["contradiction", "sjw"]),
      short: "p",
      long: "prompt",
      defaultValue: () => "contradiction",
    }),
  },
  async handler(args) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.error("no OPENROUTER_API_KEY");
      process.exit(1);
    }
    const scraper = await newScraper();
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: OPENROUTER_API_KEY,
    });

    if (args.prompt === "contradiction") {
      await contradictionCarpeteo(scraper, openai, args.param);
    } else if (args.prompt === "sjw") {
      await sjwCarpeteo(scraper, openai, args.param);
    }
  },
});

const printTweetCmd = command({
  name: "print tweet",
  args: {
    tweetId: positional({ type: string, displayName: "tweet id" }),
    json: flag({
      type: boolean,
      short: "j",
      long: "json",
      defaultValue: () => false,
    }),
  },
  async handler(args) {
    const scraper = await newScraper();
    const tweet = await scraper.getTweet(args.tweetId);
    if (args.json) {
      console.log(JSON.stringify(tweet));
    } else {
      console.log(tweet);
    }
  },
});

const flushCmd = command({
  name: "flush scraps",
  args: {},
  async handler() {
    await db.flushScraps();
  },
});

const printTweetsAndRepliesSocialdataCmd = command({
  name: "print tweets and replies via socialdata",
  args: {
    username: positional({ type: string, displayName: "username" }),
  },
  async handler(args) {
    let i = 0;
    for await (const tweet of getTweetsAndRepliesIterator(args.username)) {
      console.log(tweet);
      i++;
      if (i > 39) {
        console.log(`--> ${i} tweets`);
        process.exit(0);
      }
    }
  },
});

const printTweetSocialdataCmd = command({
  name: "print tweet via socialdata",
  args: {
    tweetId: positional({ type: string, displayName: "tweet id" }),
    json: flag({
      type: boolean,
      short: "j",
      long: "json",
      defaultValue: () => false,
    }),
  },
  async handler(args) {
    const tweet = await getTweet(args.tweetId);
    if ("status" in tweet) {
      console.error(tweet);
      process.exit(1);
    }
    if (args.json) {
      console.log(JSON.stringify(intoTwitterScraperTweet(tweet)));
    } else {
      console.log(intoTwitterScraperTweet(tweet));
    }
  },
});

const cmd = subcommands({
  name: "scraper-manzana",
  cmds: {
    "print-likes": printLikesCmd,
    "save-likes": saveLikesCmd,
    "print-tweets": printTweetsCmd,
    "print-all-tweets": printAllTweetsEverCmd,
    "save-tweets": saveTweetsAndRetweetsCmd,
    "print-following": printFollowingCmd,
    "print-tweet": printTweetCmd,
    "print-tweet-socialdata": printTweetSocialdataCmd,
    "print-tweets-and-replies-socialdata": printTweetsAndRepliesSocialdataCmd,
    flush: flushCmd,
    carpetear: carpetearCmd,
    cron: cronCmd,
    "cron-socialdata": cronSocialdataCmd,
  },
});

run(cmd, process.argv.slice(2));
