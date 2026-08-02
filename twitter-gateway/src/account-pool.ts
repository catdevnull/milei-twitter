import { readFile } from "node:fs/promises";
import { parseAccountList, type AccountInfo } from "scraper-manzana/accounts";
import {
  BrowserTwitterSession,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";

type PoolEntry = {
  account: AccountInfo;
  session?: BrowserTwitterSession;
  rateLimitedUntil: number;
};

async function loadAccounts() {
  const source = process.env.ACCOUNTS_LIST
    ? process.env.ACCOUNTS_LIST
    : await readFile(process.env.ACCOUNTS_FILE_PATH ?? "accounts.txt", "utf8");
  const accounts = parseAccountList(source, accountFormat(source));
  if (accounts.length === 0) throw new Error("The accounts file is empty");
  return accounts;
}

function accountFormat(source: string) {
  if (process.env.ACCOUNTS_FILE_FORMAT) return process.env.ACCOUNTS_FILE_FORMAT;
  const fields = source.split(/\r?\n/).find(Boolean)?.split(":") ?? [];
  if (fields.length === 5 && /^[0-9a-f]{40}$/i.test(fields[3] ?? "")) {
    return "username:password:email:authToken:emailPassword";
  }
  if (fields.length === 5) {
    return "username:password:email:emailPassword:authToken";
  }
  return undefined;
}

export class AccountPool {
  private entries?: PoolEntry[];
  private nextIndex = 0;
  private queue = Promise.resolve();

  async run<T>(work: (session: BrowserTwitterSession) => Promise<T>): Promise<T> {
    const run = this.queue.then(() => this.runUnlocked(work));
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async runUnlocked<T>(
    work: (session: BrowserTwitterSession) => Promise<T>,
  ): Promise<T> {
    this.entries ??= (await loadAccounts()).map((account) => ({
      account,
      rateLimitedUntil: 0,
    }));
    const now = Date.now();
    const available = this.entries.filter((entry) => entry.rateLimitedUntil <= now);
    if (available.length === 0) {
      const retryAt = Math.min(...this.entries.map((entry) => entry.rateLimitedUntil));
      throw new AllAccountsRateLimitedError(retryAt);
    }

    for (let attempt = 0; attempt < this.entries.length; attempt++) {
      const index = (this.nextIndex + attempt) % this.entries.length;
      const entry = this.entries[index];
      if (entry.rateLimitedUntil > now) continue;
      entry.session ??= await BrowserTwitterSession.create({ account: entry.account });
      try {
        return await work(entry.session);
      } catch (error) {
        if (!(error instanceof TwitterApiError) || error.status !== 429) throw error;
        const cooldown = Number(process.env.ACCOUNT_RATE_LIMIT_COOLDOWN_MS ?? 900_000);
        entry.rateLimitedUntil = Date.now() + cooldown;
        this.nextIndex = (index + 1) % this.entries.length;
        await entry.session.close().catch(() => {});
        entry.session = undefined;
        console.warn(
          `[twitter-gateway] @${entry.account.username} rate limited; rotating account`,
        );
      }
    }

    const retryAt = Math.min(...this.entries.map((entry) => entry.rateLimitedUntil));
    throw new AllAccountsRateLimitedError(retryAt);
  }
}

export class AllAccountsRateLimitedError extends Error {
  constructor(readonly retryAt: number) {
    super("All Twitter accounts are rate limited");
    this.name = "AllAccountsRateLimitedError";
  }
}
