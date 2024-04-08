import { command, run, string, option, subcommands } from "cmd-ts";
import { printLastLikes } from "./scraper.ts";
import { addAccounts } from "./addAccounts.ts";

const printLikesCmd = command({
  name: "print last likes",
  args: {},
  handler(args) {
    printLastLikes();
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
    "add-accounts": addAccountsCmd,
  },
});

run(cmd, process.argv.slice(2));
