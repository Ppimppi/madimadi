"use client";

import { ArrowRight, CalendarCheck2, Flame, Mic2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { DashboardSummary } from "@/lib/workspace";

export default function DashboardPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/analyses/summary", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{ summary: DashboardSummary }>;
      })
      .then((body) => { if (active && body) setSummary(body.summary); })
      .catch(() => { if (active) setSummaryError("대시보드 기록을 불러오지 못했습니다."); });
    return () => { active = false; };
  }, []);

  if (userLoading || !user || !summary) {
    if (userError || summaryError) return <WorkspaceError message={userError || summaryError} />;
    return <WorkspaceLoading label="대시보드를 불러오는 중입니다…" />;
  }

  const firstGoal = user.goals[0] ?? "자유 말하기";
  const score = summary.latestScore ?? 0;
  const scoreLabel = summary.latestScore === null ? "첫 연습 전" : `${score}점`;
  const chartData = summary.daily;

  return (
    <WorkspaceLayout active="dashboard" user={user} eyebrow="MY SPEECH DASHBOARD" title={`안녕하세요, ${user.name}님!`} description="이번 주 말하기 흐름과 오늘의 연습을 한눈에 확인하세요.">
      <section className="mm-dashboard-lead">
        <article className="mm-card mm-today-score">
          <span>오늘의 말하기 점수</span>
          <strong>{scoreLabel}</strong>
          <small className={summary.scoreDelta >= 0 ? "is-positive" : "is-negative"}>
            {summary.scoreDelta >= 0 ? <TrendingUp /> : <TrendingDown />}
            {summary.scoreDelta === 0 ? "비교할 지난주 기록이 필요해요" : `지난주보다 ${Math.abs(summary.scoreDelta)}점 ${summary.scoreDelta > 0 ? "상승" : "하락"}`}
          </small>
        </article>
        <article className="mm-card mm-weekly-challenge">
          <div>
            <span><Sparkles /> 주간 연습</span>
            <h2>{firstGoal}에 도전해보세요!</h2>
            <p>60초 동안 핵심부터 말하고, AI 분석으로 바로 확인해보세요.</p>
            <Button asChild><a href="/situational-practice">연습 시작하기 <ArrowRight /></a></Button>
          </div>
          <div className="mm-sound-figure" aria-hidden="true"><Mic2 />{[20, 38, 62, 44, 70, 34, 54].map((height, index) => <i key={index} style={{ height }} />)}</div>
        </article>
      </section>

      <section className="mm-stat-grid">
        <article className="mm-card"><span><Mic2 />총 녹음 횟수</span><strong>{summary.totalCount}<small>회</small></strong></article>
        <article className="mm-card"><span><Sparkles />이번 주 평균 점수</span><strong>{summary.weeklyAverageScore || "—"}<small>{summary.weeklyAverageScore ? "점" : ""}</small></strong></article>
        <article className="mm-card"><span><TrendingDown />이번 주 추임새</span><strong>{summary.weeklyFillerCount}<small>회</small></strong></article>
        <article className="mm-card"><span><Flame />연속 연습일</span><strong>{summary.currentStreak}<small>일</small></strong></article>
      </section>

      <section className="mm-chart-grid">
        <article className="mm-card mm-chart-card">
          <div className="mm-card-heading"><div><span>지난 7일</span><h2>말하기 점수 변화</h2></div><a href="/report">자세히 보기 <ArrowRight /></a></div>
          <div className="mm-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#eeeafa" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b879b", fontSize: 12 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#aaa5b5", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e2f8" }} formatter={(value) => [`${value}점`, "평균 점수"]} />
                <Line type="monotone" dataKey="score" stroke="#6552ed" strokeWidth={3} dot={{ r: 4, fill: "#6552ed", strokeWidth: 0 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="mm-card mm-chart-card">
          <div className="mm-card-heading"><div><span>지난 7일</span><h2>말하기 속도 (어절/분)</h2></div><small>권장 90–160</small></div>
          <div className="mm-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#eeeafa" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b879b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#aaa5b5", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e2f8" }} formatter={(value) => [`${value} 어절/분`, "평균 속도"]} />
                <Bar dataKey="speakingRate" fill="#8b7cf6" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {summary.totalCount === 0 && (
        <section className="mm-card mm-empty-inline"><CalendarCheck2 /><div><strong>아직 분석 기록이 없습니다.</strong><span>첫 녹음을 완료하면 이 대시보드가 실제 기록으로 채워집니다.</span></div><Button asChild variant="outline"><a href="/practice">첫 녹음 시작</a></Button></section>
      )}
    </WorkspaceLayout>
  );
}
