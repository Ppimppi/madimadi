"use client";

import { Camera, CheckCircle2, ChevronDown, FileText, Gauge, History, MessageCircleWarning, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

import type { SavedAnalysis } from "@/components/practice/practice-recorder";

type HistoricalAnalysis = SavedAnalysis & {
  scenarioPrompt?: string | null;
};

export function RecentFeedback({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<HistoricalAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/analyses/recent?limit=5", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{ analyses: HistoricalAnalysis[] }>;
      })
      .then((body) => {
        if (active) {
          setItems(body.analyses);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("지난 피드백을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <section className="mm-card recent-analyses mm-feedback-history">
      <div className="mm-card-heading">
        <div><span>HISTORY</span><h2>지난 피드백</h2></div>
        <small>최근 5개 분석</small>
      </div>
      <p className="history-intro">기록을 펼치면 당시 말한 내용과 음성·내용·영상 평가를 다시 볼 수 있어요.</p>

      {loading ? (
        <div className="history-empty"><span className="mm-loading-dot" />지난 피드백을 불러오는 중입니다…</div>
      ) : error ? (
        <div className="history-empty is-error"><MessageCircleWarning />{error}</div>
      ) : items.length === 0 ? (
        <div className="history-empty"><History /><span>아직 저장된 분석이 없습니다. 첫 연습을 완료하면 이곳에 피드백이 쌓입니다.</span></div>
      ) : (
        <div className="history-list">
          {items.map((item) => <FeedbackItem key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}

function FeedbackItem({ item }: { item: HistoricalAnalysis }) {
  return (
    <details className="history-item">
      <summary>
        <span className="recent-score">{item.score}<small>점</small></span>
        <span className="recent-copy">
          <strong>{item.practiceType}</strong>
          <span>{formatHistoryDate(item.createdAt)} · {formatDuration(item.durationSeconds)}</span>
        </span>
        <span className="history-summary-metrics">
          <span><Gauge />{item.speakingRate} 어절/분</span>
          <span><MessageCircleWarning />추임새 {item.fillerCount}회</span>
          {item.motion && <span><Camera />영상 {item.motion.score}점</span>}
        </span>
        <ChevronDown className="history-chevron" aria-hidden="true" />
      </summary>

      <div className="history-detail">
        {item.scenarioPrompt && (
          <section className="history-question"><Target /><div><span>연습 질문</span><strong>{item.scenarioPrompt}</strong></div></section>
        )}

        <section className="history-transcript">
          <h3><FileText />당시 말한 내용</h3>
          <p>{item.transcript}</p>
        </section>

        <section className="history-feedback-section">
          <div className="history-section-heading"><Gauge /><div><span>음성 습관 평가</span><strong>{item.speechScore}점</strong></div></div>
          <div className="history-mini-metrics">
            <span>말하기 속도 <b>{item.speakingRate} 어절/분</b></span>
            <span>추임새 <b>{item.fillerCount}회</b></span>
            <span>말한 분량 <b>{item.wordCount}어절</b></span>
          </div>
          <FeedbackPair goodTitle="음성에서 잘한 점" improveTitle="음성 습관 교정 제안" good={item.goodPoints} improvements={item.improvements} />
        </section>

        {item.contentEvaluation && (
          <section className="history-feedback-section is-content">
            <div className="history-section-heading"><Target /><div><span>내용·개연성 평가</span><strong>{item.contentEvaluation.score}점</strong></div></div>
            {item.contentEvaluation.summary && <p className="history-feedback-summary">{item.contentEvaluation.summary}</p>}
            {item.contentEvaluation.dimensions && (
              <div className="history-mini-metrics is-four">
                <span>질문 관련성 <b>{item.contentEvaluation.dimensions.questionRelevance}점</b></span>
                <span>전개 개연성 <b>{item.contentEvaluation.dimensions.logicalCoherence}점</b></span>
                <span>상황 적합성 <b>{item.contentEvaluation.dimensions.situationalFit}점</b></span>
                <span>근거 구체성 <b>{item.contentEvaluation.dimensions.specificity}점</b></span>
              </div>
            )}
            <FeedbackPair goodTitle="내용에서 잘한 점" improveTitle="내용 구성 제안" good={item.contentEvaluation.goodPoints} improvements={item.contentEvaluation.improvements} />
          </section>
        )}

        {item.motion && (
          <section className="history-feedback-section is-motion">
            <div className="history-section-heading"><Camera /><div><span>영상·표정 평가</span><strong>{item.motion.score}점</strong></div></div>
            <div className="history-mini-metrics is-four">
              <span>카메라 응시 <b>{item.motion.eyeContactRate}%</b></span>
              <span>상체 정렬 <b>{item.motion.postureRate}%</b></span>
              <span>자세 안정도 <b>{item.motion.stabilityScore}%</b></span>
              <span>표정 자연스러움 <b>{item.motion.expressionScore === null ? "—" : `${item.motion.expressionScore}점`}</b></span>
            </div>
            <FeedbackPair goodTitle="영상에서 잘한 점" improveTitle="자세·표정 교정 제안" good={item.motion.goodPoints} improvements={item.motion.improvements} />
            <p className="history-privacy-note">영상 원본은 서버에 저장하지 않으며, 분석 수치와 피드백만 보관합니다.</p>
          </section>
        )}
      </div>
    </details>
  );
}

function FeedbackPair({ goodTitle, improveTitle, good, improvements }: {
  goodTitle: string;
  improveTitle: string;
  good: string[];
  improvements: string[];
}) {
  return (
    <div className="history-feedback-pair">
      <article><h4><CheckCircle2 />{goodTitle}</h4><ul>{good.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}</ul></article>
      <article><h4><Sparkles />{improveTitle}</h4><ul>{improvements.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}</ul></article>
    </div>
  );
}

function formatHistoryDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(timestamp);
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}분 ${rest}초` : `${rest}초`;
}
