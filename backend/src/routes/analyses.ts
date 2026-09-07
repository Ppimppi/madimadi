import { randomUUID } from "node:crypto";
import { raw, Router } from "express";
import { rateLimit } from "express-rate-limit";
import { and, count, desc, eq, gte, sum } from "drizzle-orm";

import { getCurrentUser, isSameOriginRequest } from "../auth.js";
import { db } from "../db.js";
import {
  GeminiConfigurationError,
  GeminiTranscriptionError,
  transcribeKoreanSpeech,
} from "../gemini-transcription.js";
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
      return res.status(502).json({ error: "음성을 분석하지 못했습니다. 잠시 후 다시 시도해주세요." });
    }
    throw error;
  }

  if (transcript.length < 2 || transcript.length > 20_000) {
    return res.status(422).json({ error: "음성에서 분석할 말을 찾지 못했습니다." });
  }

  const result = analyzeSpeech(transcript, durationSeconds);
  const id = randomUUID();
  const createdAt = Date.now();
  try {
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
      feedback: JSON.stringify({ summary: result.summary, goodPoints: result.goodPoints, improvements: result.improvements }),
      createdAt,
    });
    return res.status(201).json({ analysis: { id, practiceType, transcript, durationSeconds, createdAt, ...result } });
  } catch (error) {
    console.error("Analysis persistence failed", error);
    return res.status(500).json({ error: "분석 결과를 저장하지 못했습니다. 잠시 후 다시 시도해주세요." });
  }
});

analysesRouter.get("/summary", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [totals, weekly, recent] = await Promise.all([
    db.select({ totalCount: count(), totalDuration: sum(analyses.durationSeconds) }).from(analyses).where(eq(analyses.userId, user.id)),
    db.select({ weeklyCount: count() }).from(analyses).where(and(eq(analyses.userId, user.id), gte(analyses.createdAt, weekStart))),
    db.select({
      id: analyses.id,
      practiceType: analyses.practiceType,
      durationSeconds: analyses.durationSeconds,
      speakingRate: analyses.speakingRate,
      fillerCount: analyses.fillerCount,
      score: analyses.score,
      createdAt: analyses.createdAt,
    }).from(analyses).where(eq(analyses.userId, user.id)).orderBy(desc(analyses.createdAt)).limit(5),
  ]);
  return res.json({
    summary: {
      totalCount: totals[0]?.totalCount ?? 0,
      totalDuration: Number(totals[0]?.totalDuration ?? 0),
      weeklyCount: weekly[0]?.weeklyCount ?? 0,
      recent,
    },
  });
});

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
