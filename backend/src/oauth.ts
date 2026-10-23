import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

import { appUrl, isProduction } from "./env.js";

export type OAuthProvider = "google" | "kakao";

export function getOAuthConfig(provider: OAuthProvider) {
  if (provider === "google") {
    const clientId = readSecret("GOOGLE_CLIENT_ID");
    const clientSecret = readSecret("GOOGLE_CLIENT_SECRET");
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }
  const clientId = readSecret("KAKAO_REST_API_KEY");
  const clientSecret = readSecret("KAKAO_CLIENT_SECRET");
  return clientId && clientSecret ? { clientId, clientSecret } : null;
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
  const expectedState = req.cookies?.[`madimadi_${provider}_oauth_state`] as unknown;
  if (
    typeof returnedState !== "string"
    || typeof expectedState !== "string"
    || !/^[a-f0-9]{64}$/.test(returnedState)
    || !/^[a-f0-9]{64}$/.test(expectedState)
  ) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expectedState, "hex"), Buffer.from(returnedState, "hex"));
}

export function loginErrorRedirect(res: Response, code: string, provider?: OAuthProvider): void {
  if (provider) clearOAuthStateCookie(res, provider);
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, new URL(`/login?oauth=${encodeURIComponent(code)}`, appUrl()).toString());
}

function readSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}
