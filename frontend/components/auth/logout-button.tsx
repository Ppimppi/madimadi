"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <Button variant="ghost" className="mm-logout" onClick={logout} disabled={submitting}>
      <LogOut /> {submitting ? "로그아웃 중" : "로그아웃"}
    </Button>
  );
}
