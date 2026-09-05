"use client";

import {
  ArrowRight,
  AudioLines,
  BarChart3,
  CalendarDays,
  MessageSquareText,
  Mic2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";

type User = { id: string; name: string; email: string; goals: string[] };
type Analysis = {
  id: string;
  practiceType: string;
  durationSeconds: number;
  speakingRate: number;
  fillerCount: number;
  score: number;
  createdAt: number;
};
type Summary = {
  totalCount: number;
  totalDuration: number;
  weeklyCount: number;
  recent: Analysis[];
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [userResponse, summaryResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/analyses/summary", { cache: "no-store" }),
        ]);
        if (userResponse.status === 401 || summaryResponse.status === 401) {
          window.location.replace("/login");
          return;
        }
        if (!userResponse.ok || !summaryResponse.ok) throw new Error("load_failed");
        const userData = (await userResponse.json()) as { user: User };
        const summaryData = (await summaryResponse.json()) as { summary: Summary };
        if (active) {
          setUser(userData.user);
          setSummary(summaryData.summary);
        }
      } catch {
        if (active) setError("대시보드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (error) {
    return <main className="auth-page"><section className="auth-card"><p className="auth-error">{error}</p><Button onClick={() => window.location.reload()}>다시 시도</Button></section></main>;
  }
  if (!user || !summary) {
    return <main className="auth-page"><p>대시보드를 불러오는 중입니다…</p></main>;
  }

  const firstGoal = user.goals[0] ?? "자유 말하기";
  const latest = summary.recent[0];
  const totalTime = summary.totalDuration < 60
    ? `${summary.totalDuration}초`
    : `${Math.floor(summary.totalDuration / 60)}분`;

  return (
    <main className="dashboard-shell">
      <DashboardSidebar active="dashboard" />
      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span>MY SPEECH DASHBOARD</span>
            <h1>안녕하세요, {user.name}님!</h1>
            <p>오늘도 한마디씩 더 편안하게 만들어봐요.</p>
          </div>
          <div className="dashboard-user">
            <span>{user.name.slice(0, 1)}</span>
            <div><strong>{user.name}</strong><small>{user.email}</small></div>
          </div>
        </header>

        <section id="practice" className="dashboard-hero-card">
          <div>
            <span className="dashboard-kicker"><Sparkles /> 오늘의 추천 연습</span>
            <h2>{firstGoal}</h2>
            <p>1분 동안 부담 없이 말해보세요. 녹음이 끝나면 말버릇과 속도를 분석해드릴게요.</p>
            <Button className="dashboard-start" asChild><a href="/practice">연습 시작하기 <ArrowRight /></a></Button>
          </div>
          <div className="dashboard-mic" aria-hidden="true"><Mic2 /></div>
        </section>

        <section className="dashboard-stats" id="report">
          <article>
            <span><CalendarDays /> 이번 주 연습</span>
            <strong>{summary.weeklyCount}회</strong>
            <small>{summary.weeklyCount > 0 ? "이번 주 기록이 쌓이고 있어요" : "첫 연습을 시작해보세요"}</small>
          </article>
          <article>
            <span><AudioLines /> 누적 말하기</span>
            <strong>{totalTime}</strong>
            <small>총 {summary.totalCount}번의 분석 기록</small>
          </article>
          <article>
            <span><BarChart3 /> 최근 점수</span>
            <strong>{latest ? `${latest.score}점` : "—"}</strong>
            <small>{latest ? `${latest.practiceType} 연습 결과` : "분석 후 점수를 확인할 수 있어요"}</small>
          </article>
        </section>

        {summary.recent.length === 0 ? (
          <section className="dashboard-empty">
            <div><MessageSquareText /></div>
            <h2>아직 분석 기록이 없습니다.</h2>
            <p>첫 연습을 완료하면 말버릇과 성장 기록이 이곳에 나타납니다.</p>
          </section>
        ) : (
          <section className="recent-analyses">
            <div className="section-heading">
              <div><span>최근 기록</span><h2>나의 말하기 분석</h2></div>
              <Button asChild variant="outline"><a href="/practice">새 연습</a></Button>
            </div>
            <div className="recent-analysis-list">
              {summary.recent.map((analysis) => (
                <article key={analysis.id}>
                  <div className="recent-score">{analysis.score}<small>점</small></div>
                  <div className="recent-copy">
                    <strong>{analysis.practiceType}</strong>
                    <span>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(analysis.createdAt))}</span>
                  </div>
                  <dl>
                    <div><dt>속도</dt><dd>{analysis.speakingRate} 어절/분</dd></div>
                    <div><dt>추임새</dt><dd>{analysis.fillerCount}회</dd></div>
                    <div><dt>시간</dt><dd>{analysis.durationSeconds}초</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
