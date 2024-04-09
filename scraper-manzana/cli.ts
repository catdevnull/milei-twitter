import { command, run, string, option, subcommands } from "cmd-ts";
import {
  cron,
  printLastLikes,
  printLastTweets,
  saveLikes,
  saveRetweets,
} from "./scraper.ts";
import { addAccounts } from "./addAccounts.ts";

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

const cronCmd = command({
  name: "cron",
  args: {},
  handler(args) {
    cron();
  },
});

const addAccountsCmd = command({
  name: "add accounts",
  args: {
    format: option({
      type: string,
      long: "format",
      short: "f",
      defaultValue() {
        return "username:password:email:emailPassword:authToken:twoFactorSecret";
      },
    }),
  },
  async handler(args) {
    await addAccounts(args.format);
  },
});

const cmd = subcommands({
  name: "scraper-manzana",
  cmds: {
    "print-likes": printLikesCmd,
    "save-likes": saveLikesCmd,
    "print-tweets": printTweetsCmd,
    "save-retweets": saveRetweetsCmd,
    "add-accounts": addAccountsCmd,
    cron: cronCmd,
  },
});

run(cmd, process.argv.slice(2));
