import { readFile } from "node:fs/promises";
import { parseAccountList, type AccountInfo } from "scraper-manzana/accounts";
import {
  BrowserTwitterSession,
  TwitterApiError,
  type TwitterApiRequestEvent,
} from "scraper-manzana/browser-twitter";

type PoolEntry = {
  account: AccountInfo;
  closing?: Promise<void>;
  inFlight: number;
  initializing?: Promise<BrowserTwitterSession>;
  rateLimitedUntil: number;
  session?: BrowserTwitterSession;
};

type AccountPoolOptions = {
  bootstrapConcurrency?: number;
  maxActiveAccounts?: number;
  perAccountConcurrency?: number;
  sessionFactory?: (account: AccountInfo) => Promise<BrowserTwitterSession>;
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

function positiveInteger(value: number | string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isTransientNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (error.name === "TimeoutError" || error.name === "AbortError") return true;
  if (error instanceof TypeError && error.message === "fetch failed")
    return true;
  const cause = error.cause;
  if (!cause || typeof cause !== "object") return false;
  const code = "code" in cause ? String(cause.code) : "";
  return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "UND_ERR_SOCKET"].includes(
    code,
  );
}

export class AccountPool {
  private activeInitializations = 0;
  private readonly bootstrapConcurrency: number;
  private entriesPromise?: Promise<PoolEntry[]>;
  private readonly initializationWaiters: Array<() => void> = [];
  private readonly maxActiveAccounts: number;
  private nextIndex = 0;
  private readonly perAccountConcurrency: number;
  private readonly sessionFactory: (
    account: AccountInfo,
  ) => Promise<BrowserTwitterSession>;
  private readonly waiters = new Set<() => void>();

  constructor(
    private readonly onApiRequest?: (
      event: TwitterApiRequestEvent,
    ) => void | Promise<void>,
    options: AccountPoolOptions = {},
  ) {
    this.bootstrapConcurrency = positiveInteger(
      options.bootstrapConcurrency ?? process.env.ACCOUNT_BOOTSTRAP_CONCURRENCY,
      1,
    );
    this.maxActiveAccounts = positiveInteger(
      options.maxActiveAccounts ?? process.env.ACCOUNT_MAX_ACTIVE_SESSIONS,
      4,
    );
    this.perAccountConcurrency = positiveInteger(
      options.perAccountConcurrency ?? process.env.ACCOUNT_CONCURRENCY,
      8,
    );
    this.sessionFactory =
      options.sessionFactory ??
      (async (account) =>
        await BrowserTwitterSession.create({
          account,
          onApiRequest: this.onApiRequest,
        }));
  }

  async run<T>(
    work: (session: BrowserTwitterSession) => Promise<T>,
  ): Promise<T> {
    const entries = await this.entries();
    const excluded = new Set<PoolEntry>();
    for (let attempt = 0; attempt < entries.length; attempt++) {
      const entry = await this.acquire(entries, excluded);
      try {
        return await work(entry.session!);
      } catch (error) {
        if (error instanceof TwitterApiError) {
          if (error.status === 429) this.markRateLimited(entry, error.retryAt);
          else if ([401, 403, 404].includes(error.status)) {
            this.markTemporarilyUnavailable(entry);
          } else throw error;
        } else if (!isTransientNetworkError(error)) {
          throw error;
        } else {
          this.markTemporarilyUnavailable(entry);
        }
        excluded.add(entry);
      } finally {
        this.release(entry);
      }
    }

    const retryAt = Math.min(...entries.map((entry) => entry.rateLimitedUntil));
    throw new AllAccountsRateLimitedError(retryAt);
  }

  private entries() {
    this.entriesPromise ??= loadAccounts().then((accounts) =>
      accounts.map((account) => ({
        account,
        inFlight: 0,
        rateLimitedUntil: 0,
      })),
    );
    return this.entriesPromise;
  }

  private async acquire(
    entries: PoolEntry[],
    excluded: ReadonlySet<PoolEntry> = new Set(),
  ): Promise<PoolEntry> {
    const failedInitializations = new Set<PoolEntry>();
    for (;;) {
      const now = Date.now();
      const ready = this.rotated(entries).filter(
        (entry) =>
          !excluded.has(entry) &&
          entry.session &&
          entry.rateLimitedUntil <= now &&
          entry.inFlight < this.perAccountConcurrency,
      );
      if (ready.length > 0) {
        const minimumLoad = Math.min(...ready.map((entry) => entry.inFlight));
        const entry = ready.find(
          (candidate) => candidate.inFlight === minimumLoad,
        )!;
        entry.inFlight += 1;
        this.advance(entries, entry);
        return entry;
      }

      const active = entries.filter(
        (entry) => entry.session || entry.initializing || entry.closing,
      ).length;
      const uninitialized = this.rotated(entries).find(
        (entry) =>
          !excluded.has(entry) &&
          !failedInitializations.has(entry) &&
          !entry.session &&
          !entry.initializing &&
          !entry.closing &&
          entry.rateLimitedUntil <= now,
      );
      if (
        uninitialized &&
        active < Math.min(this.maxActiveAccounts, entries.length)
      ) {
        uninitialized.inFlight = 1;
        try {
          await this.initialize(entries, uninitialized);
          return uninitialized;
        } catch (error) {
          uninitialized.inFlight = 0;
          failedInitializations.add(uninitialized);
          uninitialized.rateLimitedUntil =
            Date.now() +
            Number(process.env.ACCOUNT_INITIALIZATION_RETRY_MS ?? 60_000);
          console.error(
            `[twitter-gateway] could not initialize @${uninitialized.account.username}; trying another account`,
            error,
          );
          this.notifyWaiters();
          continue;
        }
      }

      const candidates = entries.filter(
        (entry) => !excluded.has(entry) && !failedInitializations.has(entry),
      );
      if (candidates.length === 0) {
        const retryAt = Math.min(
          ...entries
            .filter((entry) => !excluded.has(entry))
            .map((entry) => entry.rateLimitedUntil),
        );
        throw new AllAccountsRateLimitedError(retryAt);
      }
      const maxActive = Math.min(this.maxActiveAccounts, entries.length);
      const hasUsableActiveEntry = candidates.some(
        (entry) => entry.session || entry.initializing || entry.closing,
      );
      if (active >= maxActive && !hasUsableActiveEntry) {
        await this.waitForAvailability(10_000);
        continue;
      }

      const everyAccountLimited = candidates.every(
        (entry) => entry.rateLimitedUntil > now,
      );
      if (everyAccountLimited) {
        throw new AllAccountsRateLimitedError(
          Math.min(...candidates.map((entry) => entry.rateLimitedUntil)),
        );
      }

      const retryAt = Math.min(
        ...entries
          .map((entry) => entry.rateLimitedUntil)
          .filter((value) => value > now),
      );
      await this.waitForAvailability(
        Number.isFinite(retryAt) ? retryAt - now : undefined,
      );
    }
  }

  private async initialize(entries: PoolEntry[], entry: PoolEntry) {
    const initialization = this.withInitializationSlot(
      async () => await this.sessionFactory(entry.account),
    );
    entry.initializing = initialization;
    this.advance(entries, entry);
    try {
      entry.session = await initialization;
      console.info(
        `[twitter-gateway] @${entry.account.username} session ready`,
      );
    } finally {
      if (entry.initializing === initialization) entry.initializing = undefined;
      this.notifyWaiters();
    }
  }

  private async withInitializationSlot<T>(work: () => Promise<T>) {
    if (this.activeInitializations >= this.bootstrapConcurrency) {
      await new Promise<void>((resolve) => {
        this.initializationWaiters.push(resolve);
      });
    }
    this.activeInitializations += 1;
    try {
      return await work();
    } finally {
      this.activeInitializations -= 1;
      this.initializationWaiters.shift()?.();
    }
  }

  private markRateLimited(entry: PoolEntry, retryAt?: number) {
    const wasAvailable = entry.rateLimitedUntil <= Date.now();
    const cooldown = Number(
      process.env.ACCOUNT_RATE_LIMIT_COOLDOWN_MS ?? 900_000,
    );
    entry.rateLimitedUntil = Math.max(
      entry.rateLimitedUntil,
      retryAt && retryAt > Date.now() ? retryAt : Date.now() + cooldown,
    );
    if (wasAvailable) {
      console.warn(
        `[twitter-gateway] @${entry.account.username} rate limited; draining and rotating account`,
      );
    }
  }

  private markTemporarilyUnavailable(entry: PoolEntry) {
    entry.rateLimitedUntil = Math.max(
      entry.rateLimitedUntil,
      Date.now() +
        Number(process.env.ACCOUNT_TRANSIENT_FAILURE_COOLDOWN_MS ?? 60_000),
    );
  }

  private release(entry: PoolEntry) {
    entry.inFlight = Math.max(0, entry.inFlight - 1);
    this.closeRateLimitedSession(entry);
    this.notifyWaiters();
  }

  private closeRateLimitedSession(entry: PoolEntry) {
    if (
      entry.inFlight > 0 ||
      entry.rateLimitedUntil <= Date.now() ||
      !entry.session ||
      entry.closing
    ) {
      return;
    }
    const session = entry.session;
    entry.session = undefined;
    entry.closing = session
      .close()
      .catch((error) => {
        console.error(
          `[twitter-gateway] could not close @${entry.account.username} session`,
          error,
        );
      })
      .finally(() => {
        entry.closing = undefined;
        this.notifyWaiters();
      });
  }

  private rotated(entries: PoolEntry[]) {
    return entries.map(
      (_, offset) => entries[(this.nextIndex + offset) % entries.length],
    );
  }

  private advance(entries: PoolEntry[], entry: PoolEntry) {
    this.nextIndex = (entries.indexOf(entry) + 1) % entries.length;
  }

  private waitForAvailability(timeout?: number) {
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const done = () => {
        if (timer) clearTimeout(timer);
        this.waiters.delete(done);
        resolve();
      };
      this.waiters.add(done);
      if (timeout !== undefined) {
        timer = setTimeout(done, Math.max(1, Math.min(timeout, 2_147_483_647)));
      }
    });
  }

  private notifyWaiters() {
    const waiters = [...this.waiters];
    this.waiters.clear();
    for (const resolve of waiters) resolve();
  }
}

export class AllAccountsRateLimitedError extends Error {
  constructor(readonly retryAt: number) {
    super("All Twitter accounts are rate limited");
    this.name = "AllAccountsRateLimitedError";
  }
}
