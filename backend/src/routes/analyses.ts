import { randomUUID } from "node:crypto";
import { raw, Router } from "express";
import { rateLimit } from "express-rate-limit";
import { and, desc, eq } from "drizzle-orm";

import { getCurrentUser, isSameOriginRequest } from "../auth.js";
import { evaluateSpeechContent, type ContentEvaluation } from "../content-analysis.js";
import { db } from "../db.js";
import { buildBadges, buildDashboardSummary, buildGrowthReport } from "../insights.js";
import {
  GeminiConfigurationError,
  GeminiTranscriptionError,
  transcribeKoreanSpeech,
} from "../gemini-transcription.js";
import { parseMotionAnalysis, parseStoredMotionAnalysis, type MotionAnalysisResult } from "../motion-analysis.js";
import { analyses } from "../schema.js";
import { analyzeSpeech, isPracticeType } from "../speech-analysis.js";

export const analysesRouter = Router();

const analyzeRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "AI 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
});

const audioBodyParser = raw({
  type: (req) => {
    const contentType = req.headers["content-type"];
    return typeof contentType === "string" && contentType.toLowerCase().startsWith("audio/");
  },
  limit: "3.5mb",
});

analysesRouter.post("/", analyzeRateLimit, audioBodyParser, async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });

  const durationSeconds = Math.round(Number(singleQueryValue(req.query.durationSeconds)));
  const practiceTypeValue = singleQueryValue(req.query.practiceType);
  const practiceType = isPracticeType(practiceTypeValue) ? practiceTypeValue : "자유 말하기";
  const practicePrompt = practiceType === "자유 말하기"
    ? ""
    : sanitizePracticePrompt(singleQueryValue(req.query.prompt));
  const motion = parseMotionAnalysis(req.query as Record<string, string | string[] | undefined>);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 3 || durationSeconds > 30 * 60) {
    return res.status(400).json({ error: "3초 이상 30분 이하의 연습만 분석할 수 있습니다." });
  }

  const contentType = req.get("content-type") ?? "";
  if (!isSupportedAudioType(contentType) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(415).json({ error: "지원되는 녹음 파일을 전송해주세요." });
  }

  let transcript: string;
  try {
    transcript = await transcribeKoreanSpeech({ audio: req.body, mimeType: contentType });
  } catch (error) {
    if (error instanceof GeminiConfigurationError) {
      console.error("AI analysis is not configured", error.message);
      return res.status(503).json({ error: "AI 분석 기능이 아직 설정되지 않았습니다." });
    }
    if (error instanceof GeminiTranscriptionError) {
      return res.status(error.retryable ? 503 : 502).json({
        error: error.retryable
          ? "AI 음성 서버가 혼잡합니다. 녹음은 유지되어 있으니 잠시 후 다시 분석해주세요."
          : "음성을 분석하지 못했습니다. 녹음 상태를 확인한 뒤 다시 시도해주세요.",
      });
    }
    throw error;
  }

  if (transcript.length < 2 || transcript.length > 20_000) {
    return res.status(422).json({ error: "음성에서 분석할 말을 찾지 못했습니다." });
  }

  const speechResult = analyzeSpeech(transcript, durationSeconds);
  let contentEvaluation: ContentEvaluation | null = null;
  if (practicePrompt) {
    try {
      contentEvaluation = await evaluateSpeechContent({ practiceType, prompt: practicePrompt, transcript });
    } catch (error) {
      console.error("Content relevance evaluation skipped", error instanceof Error ? error.message : error);
    }
  }

  const score = combinedScore(speechResult.score, motion, contentEvaluation);
  const summary = overallSummary(score, contentEvaluation);
  const result = {
    ...speechResult,
    summary,
    speechScore: speechResult.score,
    score,
    motion,
    contentEvaluation,
  };
  const id = randomUUID();
  const createdAt = Date.now();
  try {
    const [previous] = await db.select({
      id: analyses.id,
      createdAt: analyses.createdAt,
      score: analyses.score,
      fillerCount: analyses.fillerCount,
      speakingRate: analyses.speakingRate,
      motionMetrics: analyses.motionMetrics,
      feedback: analyses.feedback,
    }).from(analyses).where(and(
      eq(analyses.userId, user.id),
      eq(analyses.practiceType, practiceType),
    )).orderBy(desc(analyses.createdAt)).limit(1);

    await db.insert(analyses).values({
      id,
      userId: user.id,
      practiceType,
      transcript,
      durationSeconds,
      wordCount: result.wordCount,
      fillerCount: result.fillerCount,
      fillerDetails: JSON.stringify(result.fillerDetails),
      speakingRate: result.speakingRate,
      score: result.score,
      feedback: JSON.stringify({
        summary: result.summary,
        goodPoints: result.goodPoints,
        improvements: result.improvements,
        prompt: practicePrompt || null,
        contentEvaluation,
      }),
      motionMetrics: motion ? JSON.stringify(motion) : null,
      createdAt,
    });
    const comparison = previous
      ? buildAnalysisComparison(previous, result, practiceType)
      : null;
    return res.status(201).json({ analysis: { id, practiceType, transcript, durationSeconds, createdAt, ...result }, comparison });
  } catch (error) {
    console.error("Analysis persistence failed", error);
    return res.status(500).json({ error: "분석 결과를 저장하지 못했습니다. 잠시 후 다시 시도해주세요." });
  }
});

analysesRouter.get("/summary", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const records = await loadAnalysisHistory(user.id);
  return res.json({ summary: buildDashboardSummary(records) });
});

analysesRouter.get("/report", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const period = singleQueryValue(req.query.period) === "month" ? "month" : "week";
  const records = await loadAnalysisHistory(user.id);
  return res.json({ report: buildGrowthReport(records, period) });
});

analysesRouter.get("/badges", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const records = await loadAnalysisHistory(user.id);
  return res.json({ badges: buildBadges(records) });
});

async function loadAnalysisHistory(userId: string) {
  return db.select({
    id: analyses.id,
    practiceType: analyses.practiceType,
    durationSeconds: analyses.durationSeconds,
    wordCount: analyses.wordCount,
    fillerCount: analyses.fillerCount,
    fillerDetails: analyses.fillerDetails,
    speakingRate: analyses.speakingRate,
    score: analyses.score,
    motionMetrics: analyses.motionMetrics,
    createdAt: analyses.createdAt,
  }).from(analyses).where(eq(analyses.userId, userId)).orderBy(desc(analyses.createdAt)).limit(1_000);
}

function singleQueryValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isSupportedAudioType(value: string): boolean {
  const mimeType = value.split(";", 1)[0]?.trim().toLowerCase();
  return [
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/wav",
    "audio/x-wav",
  ].includes(mimeType);
}

type PreviousAnalysis = {
  id: string;
  createdAt: number;
  score: number;
  fillerCount: number;
  speakingRate: number;
  motionMetrics: string | null;
  feedback: string;
};

type CurrentAnalysis = {
  score: number;
  fillerCount: number;
  speakingRate: number;
  motion: MotionAnalysisResult | null;
  contentEvaluation: ContentEvaluation | null;
};

type ComparisonMetric = {
  key: string;
  label: string;
  before: number;
  after: number;
  unit: string;
  delta: number;
  improved: boolean | null;
};

function buildAnalysisComparison(previous: PreviousAnalysis, current: CurrentAnalysis, practiceType: string) {
  const previousMotion = parseStoredMotionAnalysis(previous.motionMetrics);
  const previousContent = parseStoredContentEvaluation(previous.feedback);
  const metrics: ComparisonMetric[] = [
    comparisonMetric("score", "종합 점수", previous.score, current.score, "점", "higher"),
    comparisonMetric("fillerCount", "추임새", previous.fillerCount, current.fillerCount, "회", "lower"),
    comparisonMetric("speakingRate", "말하기 속도", previous.speakingRate, current.speakingRate, "어절/분", "target"),
  ];

  if (previousMotion && current.motion) {
    metrics.push(
      comparisonMetric("motionScore", "영상 점수", previousMotion.score, current.motion.score, "점", "higher"),
      comparisonMetric("eyeContactRate", "카메라 응시", previousMotion.eyeContactRate, current.motion.eyeContactRate, "%", "higher"),
      comparisonMetric("postureRate", "상체 정렬", previousMotion.postureRate, current.motion.postureRate, "%", "higher"),
    );
    if (previousMotion.expressionScore !== null && current.motion.expressionScore !== null) {
      metrics.push(comparisonMetric(
        "expressionScore",
        "표정 자연스러움",
        previousMotion.expressionScore,
        current.motion.expressionScore,
        "점",
        "higher",
      ));
    }
  }
  if (previousContent && current.contentEvaluation) {
    metrics.push(comparisonMetric(
      "contentScore",
      "내용 적합성",
      previousContent.score,
      current.contentEvaluation.score,
      "점",
      "higher",
    ));
  }

  const improvedCount = metrics.filter((metric) => metric.improved === true).length;
  const summary = improvedCount >= 3
    ? `직전 ${practiceType} 연습보다 ${improvedCount}개 지표가 좋아졌어요.`
    : improvedCount > 0
      ? `직전 ${practiceType} 연습보다 좋아진 지표가 있어요. 다음 목표도 함께 확인해보세요.`
      : `직전 ${practiceType} 연습과 비교한 결과예요. 변화가 필요한 지표를 다음 연습 목표로 잡아보세요.`;

  return {
    previousId: previous.id,
    previousCreatedAt: previous.createdAt,
    practiceType,
    summary,
    metrics,
  };
}

function comparisonMetric(
  key: string,
  label: string,
  before: number,
  after: number,
  unit: string,
  direction: "higher" | "lower" | "target",
): ComparisonMetric {
  const delta = after - before;
  let improved: boolean | null;
  if (delta === 0) improved = null;
  else if (direction === "higher") improved = delta > 0;
  else if (direction === "lower") improved = delta < 0;
  else {
    const target = 125;
    const beforeDistance = Math.abs(before - target);
    const afterDistance = Math.abs(after - target);
    improved = beforeDistance === afterDistance ? null : afterDistance < beforeDistance;
  }
  return { key, label, before, after, unit, delta, improved };
}

function sanitizePracticePrompt(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 300);
}

function combinedScore(
  speechScore: number,
  motion: MotionAnalysisResult | null,
  content: ContentEvaluation | null,
): number {
  if (content && motion) return Math.round(speechScore * 0.4 + content.score * 0.35 + motion.score * 0.25);
  if (content) return Math.round(speechScore * 0.55 + content.score * 0.45);
  if (motion) return Math.round(speechScore * 0.7 + motion.score * 0.3);
  return speechScore;
}

function overallSummary(score: number, content: ContentEvaluation | null): string {
  if (content && content.score < 50) return "말하기 습관과 함께 질문에 직접 답하는 구성을 보완해보세요.";
  if (score >= 85) return content
    ? "내용과 전달 방식이 모두 안정적이었어요. 지금의 흐름을 유지해보세요."
    : "말하기 습관과 전달 방식이 안정적이었어요. 지금의 흐름을 유지해보세요.";
  if (score >= 70) return "전체 흐름은 좋아요. 가장 낮은 지표 하나를 골라 다음 연습에서 다듬어보세요.";
  return "추임새, 내용 구성과 움직임을 하나씩 조절하면 전달력이 빠르게 좋아질 수 있어요.";
}

function parseStoredContentEvaluation(value: string): ContentEvaluation | null {
  try {
    const parsed = JSON.parse(value) as { contentEvaluation?: unknown };
    const content = parsed.contentEvaluation;
    if (!content || typeof content !== "object" || Array.isArray(content)) return null;
    const score = Number((content as { score?: unknown }).score);
    if (!Number.isFinite(score)) return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      summary: "",
      goodPoints: [],
      improvements: [],
    };
  } catch {
    return null;
  }
}
