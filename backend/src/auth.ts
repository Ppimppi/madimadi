import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";

import { db } from "./db.js";
import { appUrl, isProduction } from "./env.js";
import { oauthAccounts, sessions, users } from "./schema.js";

export const SESSION_COOKIE_NAME = "madimadi_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const ALLOWED_GOALS = ["면접 준비", "발표 연습", "일상 대화 개선", "스토리텔링 향상"] as const;

export type CurrentUser = { id: string; name: string; email: string; goals: string[] };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function isValidName(value: string): boolean {
  const length = Array.from(value.trim()).length;
  return length >= 2 && length <= 40;
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128;
}

export function sanitizeGoals(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(ALLOWED_GOALS);
  return Array.from(new Set(value.filter((goal): goal is string => typeof goal === "string" && allowed.has(goal))));
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, Buffer.from(salt, "hex"), 100_000, 32, "sha256").toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt).hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createUserWithSession(input: {
  name: string;
  email: string;
  password: string;
  goals: string[];
}) {
  const now = Date.now();
  const userId = randomUUID();
  const token = randomBytes(32).toString("hex");
  const password = hashPassword(input.password);

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: input.name.trim(),
      email: input.email,
      passwordHash: password.hash,
      passwordSalt: password.salt,
      goals: JSON.stringify(input.goals),
      createdAt: now,
    });
    await tx.insert(sessions).values({
      tokenHash: sha256(token),
      userId,
      expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
      createdAt: now,
    });
  });
  return token;
}

export async function authenticateUser(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) return null;

  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId: user.id,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
    createdAt: now,
  });
  return token;
}

export async function createOAuthSession(input: {
  provider: "google" | "kakao";
  providerAccountId: string;
  email: string;
  name: string;
}) {
  const accountId = `${input.provider}:${input.providerAccountId}`;
  const now = Date.now();
  const token = randomBytes(32).toString("hex");

  await db.transaction(async (tx) => {
    const [existingAccount] = await tx
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.id, accountId))
      .limit(1);
    const [existingUser] = existingAccount ? [] : await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    const userId = existingAccount?.userId ?? existingUser?.id ?? randomUUID();
    if (!existingAccount && !existingUser) {
      const placeholder = hashPassword(randomBytes(32).toString("hex"));
      await tx.insert(users).values({
        id: userId,
        name: input.name.trim().slice(0, 40) || "마디마디 사용자",
        email: input.email,
        passwordHash: placeholder.hash,
        passwordSalt: placeholder.salt,
        goals: "[]",
        createdAt: now,
      });
    }
    if (!existingAccount) {
      await tx.insert(oauthAccounts).values({
        id: accountId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        userId,
        email: input.email,
        createdAt: now,
      }).onConflictDoNothing();
    }
    await tx.insert(sessions).values({
      tokenHash: sha256(token),
      userId,
      expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
      createdAt: now,
    });
  });
  return token;
}

export async function getCurrentUser(req: Request): Promise<CurrentUser | null> {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, goals: users.goals })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, Date.now())))
    .limit(1);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, goals: parseGoals(user.goals) };
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction() || appUrl().protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction() || appUrl().protocol === "https:",
    path: "/",
  });
}

export function isSameOriginRequest(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return true;

  try {
    const allowedOrigins = new Set([appUrl().origin]);
    const forwardedHost = firstForwardedValue(req.get("x-forwarded-host"));
    const host = forwardedHost ?? req.get("host");

    if (host) {
      const protocol =
        firstForwardedValue(req.get("x-forwarded-proto")) ?? req.protocol;

      allowedOrigins.add(new URL(`${protocol}://${host}`).origin);
    }

    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function firstForwardedValue(
  value: string | undefined
): string | undefined {
  return value?.split(",", 1)[0]?.trim() || undefined;
}
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseGoals(value: string): string[] {
  try { return sanitizeGoals(JSON.parse(value)); } catch { return []; }
}
