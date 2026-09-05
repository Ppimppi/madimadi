import { bigint, index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  goals: text("goals").notNull().default("[]"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const oauthAccounts = pgTable("oauth_accounts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const analyses = pgTable("analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  practiceType: text("practice_type").notNull(),
  transcript: text("transcript").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  wordCount: integer("word_count").notNull(),
  fillerCount: integer("filler_count").notNull(),
  fillerDetails: text("filler_details").notNull(),
  speakingRate: integer("speaking_rate").notNull(),
  score: integer("score").notNull(),
  feedback: text("feedback").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [index("idx_analyses_user_created").on(table.userId, table.createdAt)]);
