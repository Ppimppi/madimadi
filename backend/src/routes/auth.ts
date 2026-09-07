import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";

import {
  authenticateUser,
  clearSessionCookie,
  createOAuthSession,
  createUserWithSession,
  getCurrentUser,
  hashPassword,
  isSameOriginRequest,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizeEmail,
  revokeSession,
  sanitizeGoals,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  verifyPassword,
} from "../auth.js";
import { db } from "../db.js";
import { appUrl } from "../env.js";
import {
  clearOAuthStateCookie,
  createOAuthState,
  getOAuthConfig,
  loginErrorRedirect,
  oauthCallbackUrl,
  setOAuthStateCookie,
  validOAuthState,
} from "../oauth.js";
import { users } from "../schema.js";

export const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });
authRouter.use(authLimiter);

authRouter.post("/signup", async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const body = isRecord(req.body) ? req.body : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  const goals = sanitizeGoals(body.goals);

  if (!isValidName(name)) return res.status(400).json({ error: "이름은 2자 이상 40자 이하로 입력해주세요." });
  if (!isValidEmail(email)) return res.status(400).json({ error: "올바른 이메일을 입력해주세요." });
  if (!isValidPassword(password)) return res.status(400).json({ error: "비밀번호는 8자 이상 128자 이하로 입력해주세요." });
  if (password !== passwordConfirm) return res.status(400).json({ error: "비밀번호가 서로 일치하지 않습니다." });

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "이미 가입된 이메일입니다. 로그인해주세요." });

  try {
    const token = await createUserWithSession({ name, email, password, goals });
    setSessionCookie(res, token);
    return res.status(201).json({ ok: true });
  } catch (error) {
    const code = isRecord(error) ? error.code : undefined;
    console.error("Signup persistence failed", error);
    if (code === "23505") return res.status(409).json({ error: "이미 가입된 이메일입니다. 로그인해주세요." });
    return res.status(500).json({ error: "회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }
});

authRouter.post("/login", async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const body = isRecord(req.body) ? req.body : {};
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const password = typeof body.password === "string" ? body.password : "";
  if (!isValidEmail(email) || !isValidPassword(password)) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  const token = await authenticateUser(email, password);
  if (!token) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  setSessionCookie(res, token);
  return res.json({ ok: true });
});

authRouter.post("/logout", async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  await revokeSession(req.cookies?.[SESSION_COOKIE_NAME] as string | undefined);
  clearSessionCookie(res);
  return res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const user = await getCurrentUser(req);
  return user ? res.json({ user }) : res.status(401).json({ error: "로그인이 필요합니다." });
});

authRouter.patch("/profile", async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const body = isRecord(req.body) ? req.body : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const goals = sanitizeGoals(body.goals);
  if (!isValidName(name)) return res.status(400).json({ error: "이름은 2자 이상 40자 이하로 입력해주세요." });
  await db.update(users).set({ name, goals: JSON.stringify(goals) }).where(eq(users.id, user.id));
  return res.json({ user: { ...user, name, goals } });
});

authRouter.post("/password", async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const body = isRecord(req.body) ? req.body : {};
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const passwordConfirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  if (!isValidPassword(newPassword)) return res.status(400).json({ error: "새 비밀번호는 8자 이상 128자 이하로 입력해주세요." });
  if (newPassword !== passwordConfirm) return res.status(400).json({ error: "새 비밀번호가 서로 일치하지 않습니다." });
  const [storedUser] = await db.select({ passwordHash: users.passwordHash, passwordSalt: users.passwordSalt })
    .from(users).where(eq(users.id, user.id)).limit(1);
  if (!storedUser || !verifyPassword(currentPassword, storedUser.passwordSalt, storedUser.passwordHash)) {
    return res.status(401).json({ error: "현재 비밀번호가 올바르지 않습니다." });
  }
  const password = hashPassword(newPassword);
  await db.update(users).set({ passwordHash: password.hash, passwordSalt: password.salt }).where(eq(users.id, user.id));
  return res.json({ ok: true });
});

authRouter.delete("/account", async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const body = isRecord(req.body) ? req.body : {};
  if (body.confirmation !== "마디마디 탈퇴") {
    return res.status(400).json({ error: "확인 문구를 정확히 입력해주세요." });
  }
  await db.delete(users).where(eq(users.id, user.id));
  clearSessionCookie(res);
  return res.json({ ok: true });
});

authRouter.get("/oauth/google", (req, res) => {
  const config = getOAuthConfig("google");
  if (!config) return loginErrorRedirect(res, "google_not_configured");
  const state = createOAuthState();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", oauthCallbackUrl("google"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  setOAuthStateCookie(res, "google", state);
  return res.redirect(302, url.toString());
});

authRouter.get("/oauth/google/callback", async (req, res) => {
  if (req.query.error) return loginErrorRedirect(res, "oauth_denied");
  if (typeof req.query.code !== "string" || !validOAuthState(req, "google", req.query.state)) return loginErrorRedirect(res, "oauth_state");
  const config = getOAuthConfig("google");
  if (!config) return loginErrorRedirect(res, "google_not_configured");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: req.query.code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: oauthCallbackUrl("google"), grant_type: "authorization_code" }),
    });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed");
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokens.access_token) throw new Error("Google access token missing");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) throw new Error("Google user info failed");
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || profile.email_verified !== true) return loginErrorRedirect(res, "oauth_email");
    const token = await createOAuthSession({ provider: "google", providerAccountId: profile.sub, email: normalizeEmail(profile.email), name: profile.name ?? profile.email.split("@")[0] });
    clearOAuthStateCookie(res, "google");
    setSessionCookie(res, token);
    return res.redirect(302, new URL("/dashboard", appUrl()).toString());
  } catch (error) {
    console.error("Google OAuth failed", error);
    return loginErrorRedirect(res, "oauth_exchange");
  }
});

authRouter.get("/oauth/kakao", (req, res) => {
  const config = getOAuthConfig("kakao");
  if (!config) return loginErrorRedirect(res, "kakao_not_configured");
  const state = createOAuthState();
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", oauthCallbackUrl("kakao"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "account_email,profile_nickname");
  url.searchParams.set("state", state);
  setOAuthStateCookie(res, "kakao", state);
  return res.redirect(302, url.toString());
});

authRouter.get("/oauth/kakao/callback", async (req, res) => {
  if (req.query.error) return loginErrorRedirect(res, "oauth_denied");
  if (typeof req.query.code !== "string" || !validOAuthState(req, "kakao", req.query.state)) return loginErrorRedirect(res, "oauth_state");
  const config = getOAuthConfig("kakao");
  if (!config) return loginErrorRedirect(res, "kakao_not_configured");
  try {
    const body = new URLSearchParams({ grant_type: "authorization_code", client_id: config.clientId, redirect_uri: oauthCallbackUrl("kakao"), code: req.query.code });
    if (config.clientSecret) body.set("client_secret", config.clientSecret);
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body });
    if (!tokenResponse.ok) throw new Error("Kakao token exchange failed");
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokens.access_token) throw new Error("Kakao access token missing");
    const profileResponse = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) throw new Error("Kakao user info failed");
    const profile = await profileResponse.json() as {
      id?: number;
      properties?: { nickname?: string };
      kakao_account?: { email?: string; is_email_valid?: boolean; is_email_verified?: boolean; profile?: { nickname?: string } };
    };
    const account = profile.kakao_account;
    const email = account?.email ? normalizeEmail(account.email) : "";
    if (profile.id === undefined || !email || account?.is_email_valid === false || account?.is_email_verified === false) return loginErrorRedirect(res, "oauth_email");
    const token = await createOAuthSession({ provider: "kakao", providerAccountId: String(profile.id), email, name: account?.profile?.nickname ?? profile.properties?.nickname ?? email.split("@")[0] });
    clearOAuthStateCookie(res, "kakao");
    setSessionCookie(res, token);
    return res.redirect(302, new URL("/dashboard", appUrl()).toString());
  } catch (error) {
    console.error("Kakao OAuth failed", error);
    return loginErrorRedirect(res, "oauth_exchange");
  }
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
