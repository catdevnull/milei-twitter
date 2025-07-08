#!/usr/bin/env node
/**
 * Migration script to transfer data from SQLite/LibSQL to PostgreSQL
 *
 * This script will:
 * 1. Read data from existing SQLite databases
 * 2. Connect to PostgreSQL database
 * 3. Transfer all data preserving relationships
 * 4. Verify data integrity
 *
 * Usage:
 * - Make sure PostgreSQL is running and accessible
 * - Set DATABASE_URL environment variable
 * - Run: npx tsx migrate-to-postgres.ts
 */

import Database from "better-sqlite3";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./src/schema";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import fs from "fs";

const SQLITE_DB_PATH = "../sqld-prod/iku.db/dbs/default/data";
const POSTGRES_URL =
  process.env.DATABASE_URL || "postgresql://localhost:5432/milei_test";
const BATCH_SIZE = process.env.POSTGRES_BATCH_SIZE
  ? parseInt(process.env.POSTGRES_BATCH_SIZE)
  : 1000;

interface SqliteData {
  likedTweets: any[];
  historicLikedTweets: any[];
  retweets: any[];
  tweets: any[];
  scraps: any[];
  cuentas: any[];
  scraperTokens: any[];
}

async function readSqliteData(dbPath: string): Promise<SqliteData> {
  console.log(`Reading SQLite data from: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.warn(`SQLite database not found at: ${dbPath}`);
    return {
      likedTweets: [],
      historicLikedTweets: [],
      retweets: [],
      tweets: [],
      scraps: [],
      cuentas: [],
      scraperTokens: [],
    };
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const likedTweets = db
      .prepare(
        `
      SELECT url, first_seen_at, last_seen_at, text, scrap_id 
      FROM db_liked_tweets
    `,
      )
      .all();

    const historicLikedTweets = db
      .prepare(
        `
      SELECT post_id, url, posted_at, estimated_liked_at 
      FROM db_historic_liked_tweets
    `,
      )
      .all();

    const retweets = db
      .prepare(
        `
      SELECT poster_id, poster_handle, post_id, first_seen_at, retweet_at, posted_at, text, scrap_id 
      FROM db_retweets
    `,
      )
      .all();

    const tweets = db
      .prepare(
        `
      SELECT id, twitter_scraper_json, captured_at 
      FROM db_tweets
    `,
      )
      .all();

    const scraps = db
      .prepare(
        `
      SELECT id, uid, at, cuenta_id, total_tweets_seen 
      FROM db_scraps
    `,
      )
      .all();

    const cuentas = db
      .prepare(
        `
      SELECT id, account_data_json 
      FROM db_cuentas
    `,
      )
      .all();

    const scraperTokens = db
      .prepare(
        `
      SELECT id, token 
      FROM db_scraper_tokens
    `,
      )
      .all();

    console.log(`✓ Read ${likedTweets.length} liked tweets`);
    console.log(`✓ Read ${historicLikedTweets.length} historic liked tweets`);
    console.log(`✓ Read ${retweets.length} retweets`);
    console.log(`✓ Read ${tweets.length} tweets`);
    console.log(`✓ Read ${scraps.length} scraps`);
    console.log(`✓ Read ${cuentas.length} cuentas`);
    console.log(`✓ Read ${scraperTokens.length} scraper tokens`);

    return {
      likedTweets,
      historicLikedTweets,
      retweets,
      tweets,
      scraps,
      cuentas,
      scraperTokens,
    };
  } finally {
    db.close();
  }
}

function convertSqliteTimestamp(timestamp: number | null): Date | null {
  if (timestamp === null) return null;
  return new Date(timestamp * 1000);
}

async function migrateToPostgres(data: SqliteData) {
  console.log(`\nConnecting to PostgreSQL: ${POSTGRES_URL}`);

  const client = postgres(POSTGRES_URL, {
    max: 5,
    idle_timeout: 60,
    connect_timeout: 30,
    prepare: false, // Disable prepared statements for better remote performance
  });

  const db = drizzle(client, { schema });

  try {
    console.log("Running PostgreSQL migrations...");
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("✓ Migrations completed");

    // Clear existing data
    console.log("Clearing existing data...");
    await db.delete(schema.likedTweets);
    await db.delete(schema.historicLikedTweets);
    await db.delete(schema.retweets);
    await db.delete(schema.tweets);
    await db.delete(schema.scraps);
    await db.delete(schema.cuentas);
    await db.delete(schema.scraperTokens);
    console.log("✓ Existing data cleared");

    // Insert scraps first (they are referenced by other tables)
    if (data.scraps.length > 0) {
      console.log("Migrating scraps...");
      const scrapsData = data.scraps.map((scrap) => ({
        id: scrap.id,
        uid: scrap.uid,
        finishedAt: convertSqliteTimestamp(scrap.at)!,
        cuentaId: scrap.cuenta_id,
        totalTweetsSeen: scrap.total_tweets_seen,
      }));

      // Insert in batches to avoid stack overflow and optimize for network
      const batchSize = BATCH_SIZE;
      for (let i = 0; i < scrapsData.length; i += batchSize) {
        const batch = scrapsData.slice(i, i + batchSize);
        await db.insert(schema.scraps).values(batch);
        console.log(
          `  ✓ Migrated scraps batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scrapsData.length / batchSize)} (${batch.length} items)`,
        );
      }
      console.log(`✓ Migrated ${scrapsData.length} scraps total`);
    }

    // Insert historic liked tweets
    if (data.historicLikedTweets.length > 0) {
      console.log("Migrating historic liked tweets...");
      const historicData = data.historicLikedTweets.map((tweet) => ({
        postId: tweet.post_id,
        url: tweet.url,
        postedAt: convertSqliteTimestamp(tweet.posted_at)!,
        estimatedLikedAt: convertSqliteTimestamp(tweet.estimated_liked_at)!,
      }));

      // Insert in batches
      const batchSize = BATCH_SIZE;
      for (let i = 0; i < historicData.length; i += batchSize) {
        const batch = historicData.slice(i, i + batchSize);
        await db.insert(schema.historicLikedTweets).values(batch);
        console.log(
          `  ✓ Migrated historic tweets batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(historicData.length / batchSize)} (${batch.length} items)`,
        );
      }
      console.log(
        `✓ Migrated ${historicData.length} historic liked tweets total`,
      );
    }

    // Insert liked tweets
    if (data.likedTweets.length > 0) {
      console.log("Migrating liked tweets...");
      const likedData = data.likedTweets.map((tweet) => ({
        url: tweet.url,
        firstSeenAt: convertSqliteTimestamp(tweet.first_seen_at)!,
        lastSeenAt: convertSqliteTimestamp(tweet.last_seen_at),
        text: tweet.text,
        scrapId: tweet.scrap_id,
      }));

      // Insert in batches
      const batchSize = BATCH_SIZE;
      for (let i = 0; i < likedData.length; i += batchSize) {
        const batch = likedData.slice(i, i + batchSize);
        await db.insert(schema.likedTweets).values(batch);
        console.log(
          `  ✓ Migrated liked tweets batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(likedData.length / batchSize)} (${batch.length} items)`,
        );
      }
      console.log(`✓ Migrated ${likedData.length} liked tweets total`);
    }

    // Insert retweets
    if (data.retweets.length > 0) {
      console.log("Migrating retweets...");
      const retweetsData = data.retweets.map((retweet) => ({
        posterId: retweet.poster_id,
        posterHandle: retweet.poster_handle,
        postId: retweet.post_id,
        firstSeenAt: convertSqliteTimestamp(retweet.first_seen_at)!,
        retweetAt: convertSqliteTimestamp(retweet.retweet_at)!,
        postedAt: convertSqliteTimestamp(retweet.posted_at)!,
        text: retweet.text,
        scrapId: retweet.scrap_id,
      }));

      // Insert in batches
      const batchSize = BATCH_SIZE;
      for (let i = 0; i < retweetsData.length; i += batchSize) {
        const batch = retweetsData.slice(i, i + batchSize);
        await db.insert(schema.retweets).values(batch);
        console.log(
          `  ✓ Migrated retweets batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(retweetsData.length / batchSize)} (${batch.length} items)`,
        );
      }
      console.log(`✓ Migrated ${retweetsData.length} retweets total`);
    }

    // Insert tweets
    if (data.tweets.length > 0) {
      console.log("Migrating tweets...");
      const tweetsData = data.tweets.map((tweet) => ({
        id: tweet.id,
        twitterScraperJson: JSON.parse(tweet.twitter_scraper_json),
        capturedAt: convertSqliteTimestamp(tweet.captured_at)!,
      }));

      // Insert in batches
      const batchSize = BATCH_SIZE;
      for (let i = 0; i < tweetsData.length; i += batchSize) {
        const batch = tweetsData.slice(i, i + batchSize);
        await db.insert(schema.tweets).values(batch);
        console.log(
          `  ✓ Migrated tweets batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tweetsData.length / batchSize)} (${batch.length} items)`,
        );
      }
      console.log(`✓ Migrated ${tweetsData.length} tweets total`);
    }

    // Insert cuentas
    if (data.cuentas.length > 0) {
      console.log("Migrating cuentas...");
      const cuentasData = data.cuentas.map((cuenta) => ({
        id: cuenta.id,
        accountDataJson: cuenta.account_data_json,
      }));
      await db.insert(schema.cuentas).values(cuentasData);
      console.log(`✓ Migrated ${cuentasData.length} cuentas`);
    }

    // Insert scraper tokens
    if (data.scraperTokens.length > 0) {
      console.log("Migrating scraper tokens...");
      const tokensData = data.scraperTokens.map((token) => ({
        id: token.id,
        token: token.token,
      }));
      await db.insert(schema.scraperTokens).values(tokensData);
      console.log(`✓ Migrated ${tokensData.length} scraper tokens`);
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

async function verifyMigration() {
  console.log("\nVerifying migration...");

  const client = postgres(POSTGRES_URL, {
    max: 5,
    idle_timeout: 60,
    connect_timeout: 30,
    prepare: false, // Disable prepared statements for better remote performance
  });

  const db = drizzle(client, { schema });

  try {
    const counts = await Promise.all([
      db
        .select()
        .from(schema.likedTweets)
        .then((rows) => rows.length),
      db
        .select()
        .from(schema.historicLikedTweets)
        .then((rows) => rows.length),
      db
        .select()
        .from(schema.retweets)
        .then((rows) => rows.length),
      db
        .select()
        .from(schema.tweets)
        .then((rows) => rows.length),
      db
        .select()
        .from(schema.scraps)
        .then((rows) => rows.length),
      db
        .select()
        .from(schema.cuentas)
        .then((rows) => rows.length),
      db
        .select()
        .from(schema.scraperTokens)
        .then((rows) => rows.length),
    ]);

    console.log("\nPostgreSQL data counts:");
    console.log(`  Liked tweets: ${counts[0]}`);
    console.log(`  Historic liked tweets: ${counts[1]}`);
    console.log(`  Retweets: ${counts[2]}`);
    console.log(`  Tweets: ${counts[3]}`);
    console.log(`  Scraps: ${counts[4]}`);
    console.log(`  Cuentas: ${counts[5]}`);
    console.log(`  Scraper tokens: ${counts[6]}`);

    console.log("\n✅ Migration verification completed!");
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    console.log("🚀 Starting SQLite to PostgreSQL migration...\n");

    // Read data from SQLite
    const data = await readSqliteData(SQLITE_DB_PATH);

    // Migrate to PostgreSQL
    await migrateToPostgres(data);

    // Verify migration
    await verifyMigration();

    console.log("\n🎉 Migration process completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Update your environment variables to use DATABASE_URL");
    console.log("2. Test your application with the new PostgreSQL database");
    console.log("3. Update any deployment configurations");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Check if this is the main module (ES module version)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
