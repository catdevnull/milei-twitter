import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("db_twitter_sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  username: text("username"),
  password: text("password"),
  email: text("email"),
  emailPassword: text("email_password"),
  twoFactorSecret: text("two_factor_secret"),

  lastFailedAt: integer("last_failed_at", { mode: "timestamp" }),

  cookiesJson: text("cookies_json"),
});
