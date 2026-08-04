import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { TwitterApiRequestEvent } from "scraper-manzana/browser-twitter";

export type RequestStats = {
  failed: number;
  lastRequestAt?: number;
  lastStatus?: number;
  lastThirtyMinutes: number;
  total: number;
};

export class RequestDatabase {
  private readonly database: DatabaseSync;

  constructor(path = process.env.SQLITE_PATH ?? "twitter-gateway.sqlite") {
    const absolutePath = resolve(path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new DatabaseSync(absolutePath);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS x_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        operation TEXT NOT NULL,
        status INTEGER,
        duration_ms INTEGER NOT NULL,
        account TEXT,
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS x_requests_started_at_idx
        ON x_requests(started_at);
    `);
  }

  record(event: TwitterApiRequestEvent) {
    this.database
      .prepare(
        `
        INSERT INTO x_requests (
          started_at, method, path, operation, status, duration_ms, account, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        event.startedAt.getTime(),
        event.method,
        event.path,
        event.operation,
        event.status ?? null,
        event.durationMs,
        event.account ?? null,
        event.error ?? null,
      );
  }

  stats(): RequestStats {
    const cutoff = Date.now() - 30 * 60 * 1_000;
    const counts = this.database
      .prepare(
        `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN started_at >= ? THEN 1 ELSE 0 END) AS recent,
          SUM(CASE WHEN status IS NULL OR status < 200 OR status >= 300 THEN 1 ELSE 0 END) AS failed
        FROM x_requests
      `,
      )
      .get(cutoff) as {
      total: number;
      recent: number | null;
      failed: number | null;
    };
    const last = this.database
      .prepare(
        "SELECT started_at, status FROM x_requests ORDER BY id DESC LIMIT 1",
      )
      .get() as { started_at: number; status: number | null } | undefined;
    return {
      failed: counts.failed ?? 0,
      lastRequestAt: last?.started_at,
      lastStatus: last?.status ?? undefined,
      lastThirtyMinutes: counts.recent ?? 0,
      total: counts.total,
    };
  }

  close() {
    (this.database as DatabaseSync & { close: () => void }).close();
  }
}
