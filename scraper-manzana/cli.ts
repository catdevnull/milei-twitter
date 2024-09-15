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
  saveRetweets,
} from "./scraper.ts";
import OpenAI from "openai";
import { contradictionCarpeteo, sjwCarpeteo } from "./carpeteo.ts";

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

const saveRetweetsCmd = command({
  name: "save last retweets",
  args: {},
  async handler() {
    const scraper = await newScraper();
    saveRetweets(scraper);
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
  },
  async handler(args) {
    const scraper = await newScraper();
    const tweet = await scraper.getTweet(args.tweetId);
    console.log(tweet);
  },
});

const cmd = subcommands({
  name: "scraper-manzana",
  cmds: {
    "print-likes": printLikesCmd,
    "save-likes": saveLikesCmd,
    "print-tweets": printTweetsCmd,
    "print-all-tweets": printAllTweetsEverCmd,
    "save-retweets": saveRetweetsCmd,
    "print-following": printFollowingCmd,
    "print-tweet": printTweetCmd,
    carpetear: carpetearCmd,
    cron: cronCmd,
  },
});

run(cmd, process.argv.slice(2));
