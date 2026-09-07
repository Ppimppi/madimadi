"use client";

import { useEffect, useState } from "react";

import type { CurrentUser } from "@/lib/workspace";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace("/login");
          return null;
        }
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{ user: CurrentUser }>;
      })
      .then((body) => {
        if (active && body) setUser(body.user);
      })
      .catch(() => {
        if (active) setError("사용자 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { user, setUser, loading, error };
}
