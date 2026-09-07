"use client";

import { Award, Check, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { useCurrentUser } from "@/hooks/use-current-user";

type BadgeItem = {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  progress: number;
  earned: boolean;
  earnedAt: number | null;
};

export default function BadgesPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [badges, setBadges] = useState<BadgeItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/analyses/badges", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{ badges: BadgeItem[] }>;
      })
      .then((body) => { if (active) setBadges(body.badges); })
      .catch(() => { if (active) setError("배지 정보를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, []);

  if (userError || error) return <WorkspaceError message={userError || error} />;
  if (userLoading || !user || !badges) return <WorkspaceLoading label="배지를 불러오는 중입니다…" />;
  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <WorkspaceLayout active="badges" user={user} eyebrow="MY ACHIEVEMENTS" title="나의 배지" description="연습 기록이 쌓일수록 새로운 말하기 성취가 열립니다.">
      <section className="mm-card mm-badge-overview"><div><span><Sparkles /> 현재 달성도</span><h2>{earnedCount}개의 배지를 획득했어요</h2><p>총 {badges.length}개 중 {earnedCount}개 완료</p></div><strong>{Math.round((earnedCount / badges.length) * 100)}<small>%</small></strong></section>
      <section className="mm-badge-grid">
        {badges.map((badge, index) => {
          const percentage = Math.min(100, Math.round((badge.progress / badge.target) * 100));
          return (
            <article key={badge.id} className={`mm-card mm-badge-card ${badge.earned ? "earned" : "locked"}`}>
              <span className={`mm-badge-medal medal-${index % 3}`}><Award />{badge.earned ? <i><Check /></i> : <i><LockKeyhole /></i>}</span>
              <h2>{badge.title}</h2>
              <p>{badge.description}</p>
              {badge.earned ? (
                <strong className="mm-earned-label">획득 완료</strong>
              ) : (
                <div className="mm-badge-progress"><span><i style={{ width: `${percentage}%` }} /></span><small>{badge.progress}/{badge.target}{badge.unit}</small></div>
              )}
              <time>{badge.earnedAt ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(badge.earnedAt)) : "아직 획득하지 못했어요"}</time>
            </article>
          );
        })}
      </section>
    </WorkspaceLayout>
  );
}
