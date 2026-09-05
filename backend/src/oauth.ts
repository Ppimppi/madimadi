import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";

import { appUrl, isProduction } from "./env.js";

export type OAuthProvider = "google" | "kakao";

export function getOAuthConfig(provider: OAuthProvider) {
  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }
  const clientId = process.env.KAKAO_REST_API_KEY;
  return clientId ? { clientId, clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "" } : null;
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return new URL(`/api/auth/oauth/${provider}/callback`, appUrl()).toString();
}

export function createOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function setOAuthStateCookie(res: Response, provider: OAuthProvider, state: string): void {
  res.cookie(`madimadi_${provider}_oauth_state`, state, {
    path: `/api/auth/oauth/${provider}`,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction() || appUrl().protocol === "https:",
    maxAge: 10 * 60 * 1000,
  });
}

export function clearOAuthStateCookie(res: Response, provider: OAuthProvider): void {
  res.clearCookie(`madimadi_${provider}_oauth_state`, {
    path: `/api/auth/oauth/${provider}`,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction() || appUrl().protocol === "https:",
  });
}

export function validOAuthState(req: Request, provider: OAuthProvider, returnedState: unknown): boolean {
  return typeof returnedState === "string"
    && /^[a-f0-9]{64}$/.test(returnedState)
    && req.cookies?.[`madimadi_${provider}_oauth_state`] === returnedState;
}

export function loginErrorRedirect(res: Response, code: string): void {
  res.redirect(302, new URL(`/login?oauth=${encodeURIComponent(code)}`, appUrl()).toString());
}
