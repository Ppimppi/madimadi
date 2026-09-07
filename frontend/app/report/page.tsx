"use client";

import { Award, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { AnalysisSummaryItem, DailyAnalysisPoint } from "@/lib/workspace";

type Period = "week" | "month";
type GrowthReport = {
  period: Period;
  count: number;
  previousCount: number;
  averages: { score: number; fillerCount: number; speakingRate: number };
  previousAverages: { score: number; fillerCount: number; speakingRate: number };
  changes: { score: number; fillerReduction: number; speakingRate: number };
  streakDays: number;
  daily: DailyAnalysisPoint[];
  recent: AnalysisSummaryItem[];
};
type BadgeItem = { id: string; title: string; description: string; target: number; unit: string; progress: number; earned: boolean; earnedAt: number | null };

export default function ReportPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [period, setPeriod] = useState<Period>("week");
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/analyses/report?period=${period}`, { cache: "no-store" }),
      fetch("/api/analyses/badges", { cache: "no-store" }),
    ]).then(async ([reportResponse, badgesResponse]) => {
      if (!reportResponse.ok || !badgesResponse.ok) throw new Error("load_failed");
      const reportBody = await reportResponse.json() as { report: GrowthReport };
      const badgesBody = await badgesResponse.json() as { badges: BadgeItem[] };
      if (active) {
        setReport(reportBody.report);
        setBadges(badgesBody.badges);
      }
    }).catch(() => {
      if (active) setError("성장 리포트를 불러오지 못했습니다.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [period]);

  if (userError || error) return <WorkspaceError message={userError || error} />;
  if (userLoading || !user || loading || !report) return <WorkspaceLoading label="성장 리포트를 계산하는 중입니다…" />;

  const periodLabel = period === "week" ? "이번 주" : "이번 달";
  const headline = report.previousCount > 0 && report.changes.fillerReduction > 0
    ? `${periodLabel} 말버릇 ${report.changes.fillerReduction}% 감소!`
    : report.count > 0
      ? `${periodLabel} ${report.count}번 연습했어요!`
      : `${periodLabel} 첫 기록을 만들어보세요.`;
  const earnedBadges = badges.filter((badge) => badge.earned).slice(0, 3);

  return (
    <WorkspaceLayout active="report" user={user} eyebrow="GROWTH REPORT" title="성장 리포트" description="저장된 분석 기록을 비교해 말하기 습관의 변화를 보여드립니다.">
      <Tabs value={period} onValueChange={(value) => { setLoading(true); setError(""); setPeriod(value as Period); }} className="mm-report-tabs">
        <TabsList className="mm-period-tabs"><TabsTrigger value="week">주간 리포트</TabsTrigger><TabsTrigger value="month">월간 리포트</TabsTrigger></TabsList>
      </Tabs>

      <section className="mm-card mm-report-summary">
        <span><Sparkles /> {periodLabel} 요약</span>
        <h2>{headline}</h2>
        <div className="mm-comparison-grid">
          <Comparison label="평균 점수" previous={report.previousAverages.score} current={report.averages.score} unit="점" />
          <Comparison label="평균 추임새" previous={report.previousAverages.fillerCount} current={report.averages.fillerCount} unit="회" reverse />
          <Comparison label="말하기 속도" previous={report.previousAverages.speakingRate} current={report.averages.speakingRate} unit="어절/분" />
        </div>
      </section>

      <section className="mm-chart-grid mm-report-charts">
        <ReportChart title="말버릇 횟수 변화" data={report.daily} dataKey="fillerCount" color="#f08a72" unit="회" />
        <ReportChart title="말하기 점수 추이" data={report.daily.map((item) => ({ ...item, score: item.score ?? 0 }))} dataKey="score" color="#6552ed" unit="점" domain={[0, 100]} />
      </section>

      <section className="mm-card mm-report-badges">
        <div className="mm-card-heading"><div><span>이번 기간의 성취</span><h2>획득한 배지</h2></div><a href="/badges">전체 배지 보기</a></div>
        {earnedBadges.length > 0 ? (
          <div className="mm-earned-row">{earnedBadges.map((badge, index) => <article key={badge.id}><span className={`mm-mini-medal medal-${index % 3}`}><Award /></span><div><strong>{badge.title}</strong><small>{badge.description}</small></div></article>)}</div>
        ) : (
          <div className="mm-empty-copy"><Award /><span>연습을 완료하면 이곳에 획득한 배지가 표시됩니다.</span></div>
        )}
      </section>
    </WorkspaceLayout>
  );
}

function Comparison({ label, previous, current, unit, reverse = false }: { label: string; previous: number; current: number; unit: string; reverse?: boolean }) {
  const improved = reverse ? current < previous : current > previous;
  return (
    <article><span>{label}</span><strong>{previous || "—"}<small>{previous ? unit : ""}</small><i>→</i>{current || "—"}<small>{current ? unit : ""}</small></strong><em className={improved ? "is-positive" : ""}>{improved ? <TrendingUp /> : <TrendingDown />}{previous ? `${Math.abs(current - previous)}${unit} 변화` : "이전 기록 없음"}</em></article>
  );
}

function ReportChart({ title, data, dataKey, color, unit, domain }: { title: string; data: Array<DailyAnalysisPoint | (DailyAnalysisPoint & { score: number })>; dataKey: "fillerCount" | "score"; color: string; unit: string; domain?: [number, number] }) {
  return (
    <article className="mm-card mm-chart-card">
      <div className="mm-card-heading"><div><span>기간별 변화</span><h2>{title}</h2></div></div>
      <div className="mm-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#eeeafa" vertical={false} />
            <XAxis dataKey="label" interval="preserveStartEnd" axisLine={false} tickLine={false} tick={{ fill: "#8b879b", fontSize: 11 }} />
            <YAxis domain={domain} axisLine={false} tickLine={false} tick={{ fill: "#aaa5b5", fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e2f8" }} formatter={(value) => [`${value}${unit}`, title]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3, fill: color, strokeWidth: 0 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
