import {
  boolean,
  command,
  flag,
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
  name: "print all tweets ever without sorting in jsonl",
  args: {},
  handler(args) {
    printAllTweetsEver();
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

const cmd = subcommands({
  name: "scraper-manzana",
  cmds: {
    "print-likes": printLikesCmd,
    "save-likes": saveLikesCmd,
    "print-tweets": printTweetsCmd,
    "print-all-tweets": printAllTweetsEverCmd,
    "save-retweets": saveRetweetsCmd,
    "print-following": printFollowingCmd,
    cron: cronCmd,
  },
});

run(cmd, process.argv.slice(2));
