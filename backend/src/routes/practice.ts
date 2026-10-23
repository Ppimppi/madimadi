import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { getCurrentUser, isSameOriginRequest } from "../auth.js";
import { generatePracticeQuestion, isScenarioMode } from "../practice-question.js";

export const practiceRouter = Router();

const questionRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "새 질문을 너무 빠르게 요청하고 있습니다. 잠시 후 다시 시도해주세요." },
});

practiceRouter.post("/question", questionRateLimit, async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });

  const body = isRecord(req.body) ? req.body : {};
  if (!isScenarioMode(body.mode)) {
    return res.status(400).json({ error: "면접, 발표, 회의, 대화 중 연습 모드를 선택해주세요." });
  }

  const question = await generatePracticeQuestion({
    mode: body.mode,
    previousQuestions: sanitizeStringList(body.previousQuestions, 8, 180),
    previousCategories: sanitizeStringList(body.previousCategories, 4, 40),
    goals: user.goals,
  });
  return res.json(question);
});

function sanitizeStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "string") return [];
    const text = item.trim().replace(/\s+/g, " ").slice(0, maxLength);
    return text ? [text] : [];
  }).slice(-maxItems);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
