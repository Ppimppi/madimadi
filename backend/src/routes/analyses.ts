import { randomUUID } from "node:crypto";
import { Router } from "express";
import { and, count, desc, eq, gte, sum } from "drizzle-orm";

import { getCurrentUser, isSameOriginRequest } from "../auth.js";
import { db } from "../db.js";
import { analyses } from "../schema.js";
import { analyzeSpeech, isPracticeType } from "../speech-analysis.js";

export const analysesRouter = Router();

analysesRouter.post("/", async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });

  const body = isRecord(req.body) ? req.body : {};
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  const durationSeconds = typeof body.durationSeconds === "number" ? Math.round(body.durationSeconds) : 0;
  const practiceType = isPracticeType(body.practiceType) ? body.practiceType : "자유 말하기";
  if (transcript.length < 2 || transcript.length > 20_000) return res.status(400).json({ error: "받아쓰기 내용을 2자 이상 입력해주세요." });
  if (durationSeconds < 3 || durationSeconds > 30 * 60) return res.status(400).json({ error: "3초 이상 30분 이하의 연습만 분석할 수 있습니다." });

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
