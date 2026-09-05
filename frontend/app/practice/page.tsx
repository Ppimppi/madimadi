"use client";

import { useEffect, useState } from "react";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { PracticeRecorder } from "@/components/practice/practice-recorder";

type User = { id: string; name: string; email: string; goals: string[] };

export default function PracticePage() {
  const [user, setUser] = useState<User | null>(null);
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
        return response.json() as Promise<{ user: User }>;
      })
      .then((data) => { if (active && data) setUser(data.user); })
      .catch(() => { if (active) setError("사용자 정보를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, []);

  if (error) return <main className="auth-page"><p className="auth-error">{error}</p></main>;
  if (!user) return <main className="auth-page"><p>연습 화면을 불러오는 중입니다…</p></main>;

  return (
    <main className="dashboard-shell">
      <DashboardSidebar active="analysis" />
      <section className="dashboard-main practice-main">
        <header className="dashboard-topbar practice-topbar">
          <div>
            <span>VOICE PRACTICE</span>
            <h1>말하기 연습</h1>
            <p>직접 녹음하고 말하기 속도와 추임새를 확인해보세요.</p>
          </div>
          <div className="dashboard-user">
            <span>{user.name.slice(0, 1)}</span>
            <div><strong>{user.name}</strong><small>{user.email}</small></div>
          </div>
        </header>
        <PracticeRecorder />
      </section>
    </main>
  );
}
