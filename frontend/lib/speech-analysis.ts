export const PRACTICE_TYPES = ["자유 말하기", "면접", "발표", "회의"] as const;

export type PracticeType = (typeof PRACTICE_TYPES)[number];

const FILLER_WORDS = ["음", "어", "저기", "그러니까", "약간", "뭔가"] as const;

export type SpeechAnalysisResult = {
  wordCount: number;
  fillerCount: number;
  fillerDetails: Record<string, number>;
  speakingRate: number;
  score: number;
  summary: string;
  goodPoints: string[];
  improvements: string[];
};

export function isPracticeType(value: unknown): value is PracticeType {
  return typeof value === "string" && PRACTICE_TYPES.includes(value as PracticeType);
}

export function analyzeSpeech(
  transcript: string,
  durationSeconds: number,
): SpeechAnalysisResult {
  const tokens = transcript
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^[^0-9A-Za-z가-힣]+|[^0-9A-Za-z가-힣]+$/g, ""))
    .filter(Boolean);

  const fillerDetails: Record<string, number> = {};
  for (const filler of FILLER_WORDS) {
    const count = tokens.filter((token) => token === filler).length;
    if (count > 0) fillerDetails[filler] = count;
  }

  const wordCount = tokens.length;
  const fillerCount = Object.values(fillerDetails).reduce((sum, count) => sum + count, 0);
  const speakingRate = Math.round(wordCount / Math.max(durationSeconds / 60, 1 / 60));
  const fillerRate = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0;

  let pacePenalty = 0;
  if (speakingRate < 90) pacePenalty = Math.min(30, (90 - speakingRate) * 0.35);
  if (speakingRate > 170) pacePenalty = Math.min(30, (speakingRate - 170) * 0.25);

  const fillerPenalty = Math.min(35, fillerRate * 4);
  const lengthPenalty = wordCount < 10 ? 12 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - pacePenalty - fillerPenalty - lengthPenalty)));

  const goodPoints: string[] = [];
  const improvements: string[] = [];

  if (speakingRate >= 90 && speakingRate <= 170) {
    goodPoints.push("듣는 사람이 따라가기 편한 속도를 유지했어요.");
  } else if (speakingRate < 90) {
    improvements.push("문장 사이의 멈춤을 줄여 조금 더 자연스럽게 이어 말해보세요.");
  } else {
    improvements.push("핵심 문장 뒤에 짧게 숨을 쉬며 속도를 낮춰보세요.");
  }

  if (fillerCount === 0) {
    goodPoints.push("불필요한 추임새 없이 또렷하게 말했어요.");
  } else if (fillerRate <= 4) {
    goodPoints.push("추임새 사용이 적어 전달 흐름이 안정적이에요.");
  } else {
    const mostUsed = Object.entries(fillerDetails).sort((a, b) => b[1] - a[1])[0];
    improvements.push(
      mostUsed
        ? `‘${mostUsed[0]}’ 대신 1초간 멈춘 뒤 다음 문장을 시작해보세요.`
        : "추임새 대신 잠깐 멈추는 연습을 해보세요.",
    );
  }

  if (wordCount >= 25) {
    goodPoints.push("분석하기에 충분한 분량으로 연습을 마쳤어요.");
  } else {
    improvements.push("다음에는 30초 이상 말해 더 정확한 분석을 받아보세요.");
  }

  const summary =
    score >= 85
      ? "안정적으로 전달했어요. 지금의 흐름을 유지해보세요."
      : score >= 70
        ? "전체 흐름은 좋아요. 한 가지 습관만 다듬으면 더 선명해집니다."
        : "속도와 추임새를 하나씩 조절하면 전달력이 빠르게 좋아질 수 있어요.";

  return { wordCount, fillerCount, fillerDetails, speakingRate, score, summary, goodPoints, improvements };
}
