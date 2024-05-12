import {
  command,
  run,
  string,
  option,
  subcommands,
  positional,
  flag,
  boolean,
} from "cmd-ts";
import {
  cron,
  printFollowing,
  printLastLikes,
  printLastTweets,
  saveLikes,
  saveRetweets,
} from "./scraper.ts";

const printLikesCmd = command({
  name: "print last likes",
  args: {},
  handler(args) {
    printLastLikes();
  },
});

const saveLikesCmd = command({
  name: "save last likes",
  args: {},
  handler(args) {
    saveLikes();
  },
});

const printTweetsCmd = command({
  name: "print last tweets",
  args: {},
  handler(args) {
    printLastTweets();
  },
});

const saveRetweetsCmd = command({
  name: "save last retweets",
  args: {},
  handler(args) {
    saveRetweets();
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
  handler(args) {
    cron();
  },
});

const cmd = subcommands({
  name: "scraper-manzana",
  cmds: {
    "print-likes": printLikesCmd,
    "save-likes": saveLikesCmd,
    "print-tweets": printTweetsCmd,
    "save-retweets": saveRetweetsCmd,
    "print-following": printFollowingCmd,
    cron: cronCmd,
  },
});

run(cmd, process.argv.slice(2));
