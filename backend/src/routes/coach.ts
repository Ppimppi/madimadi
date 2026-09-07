import { GoogleGenAI } from "@google/genai";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { getCurrentUser, isSameOriginRequest } from "../auth.js";
import { db } from "../db.js";
import { parseFillerDetails } from "../insights.js";
import { analyses } from "../schema.js";

export const coachRouter = Router();

const coachRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "AI 코치에게 너무 빠르게 질문하고 있습니다. 잠시 후 다시 시도해주세요." },
});

type CoachMessage = { role: "user" | "assistant"; content: string };

coachRouter.post("/", coachRateLimit, async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  const messages = sanitizeMessages(isRecord(req.body) ? req.body.messages : undefined);
  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return res.status(400).json({ error: "AI 코치에게 보낼 질문을 입력해주세요." });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return res.status(503).json({ error: "AI 코치 기능이 아직 설정되지 않았습니다." });

  const recent = await db.select({
    practiceType: analyses.practiceType,
    fillerCount: analyses.fillerCount,
    fillerDetails: analyses.fillerDetails,
    speakingRate: analyses.speakingRate,
    score: analyses.score,
    createdAt: analyses.createdAt,
  }).from(analyses).where(eq(analyses.userId, user.id)).orderBy(desc(analyses.createdAt)).limit(5);

  const analysisContext = recent.length > 0
    ? recent.map((item, index) => {
      const fillers = Object.entries(parseFillerDetails(item.fillerDetails))
        .map(([word, count]) => `${word} ${count}회`).join(", ") || "감지 없음";
      return `${index + 1}. ${item.practiceType}: ${item.score}점, ${item.speakingRate}어절/분, 추임새 ${item.fillerCount}회(${fillers})`;
    }).join("\n")
    : "아직 완료한 분석 기록이 없습니다.";
  const conversation = messages.map((item) => `${item.role === "user" ? "사용자" : "코치"}: ${item.content}`).join("\n");
  const prompt = [
    "당신은 한국어 말하기 연습 서비스 '마디마디'의 친절하고 구체적인 AI 코치입니다.",
    "사용자의 최근 분석 기록을 근거로 답하고, 기록에 없는 사실을 지어내지 마세요.",
    "답변은 한국어 존댓말로 2~5문장, 최대 500자 안에서 작성하세요.",
    "실제로 바로 해볼 수 있는 연습 방법을 최소 하나 포함하세요.",
    "의학적 진단이나 단정은 하지 마세요.",
    `사용자 이름: ${user.name}`,
    `사용자 목표: ${user.goals.join(", ") || "설정되지 않음"}`,
    "최근 분석 기록:",
    analysisContext,
    "대화:",
    conversation,
    "코치 답변:",
  ].join("\n");

  try {
    const client = new GoogleGenAI({ apiKey });
    const interaction = await client.interactions.create(
      {
        model: process.env.GEMINI_COACH_MODEL?.trim() || "gemini-3.5-flash-lite",
        input: prompt,
        store: false,
      },
      { timeout: 45_000 },
    );
    const reply = interaction.output_text?.trim();
    if (!reply) throw new Error("Gemini returned no coach response");
    return res.json({ reply: reply.slice(0, 700) });
  } catch (error) {
    console.error("Gemini coach request failed", error instanceof Error ? error.message : error);
    return res.status(502).json({ error: "AI 코치의 답변을 만들지 못했습니다. 잠시 후 다시 시도해주세요." });
  }
});

function sanitizeMessages(value: unknown): CoachMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-10).flatMap((item): CoachMessage[] => {
    if (!isRecord(item)) return [];
    const role = item.role === "user" || item.role === "assistant" ? item.role : null;
    const content = typeof item.content === "string" ? item.content.trim().slice(0, 500) : "";
    return role && content ? [{ role, content }] : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
