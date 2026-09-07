export const PRACTICE_TYPES = ["자유 말하기", "면접", "발표", "회의"] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

const FILLER_WORDS = [
  "음",
  "으음",
  "어",
  "엄",
  "저기",
  "그러니까",
  "그니까",
  "뭐랄까",
  "있잖아",
  "있잖아요",
  "약간",
  "뭔가",
] as const;

export function isPracticeType(value: unknown): value is PracticeType {
  return typeof value === "string" && PRACTICE_TYPES.includes(value as PracticeType);
}

export function analyzeSpeech(transcript: string, durationSeconds: number) {
  const tokens = transcript.trim().split(/\s+/)
    .map((token) => token.replace(/^[^0-9A-Za-z가-힣]+|[^0-9A-Za-z가-힣]+$/g, ""))
    .filter(Boolean);
  const fillerDetails: Record<string, number> = {};
  for (const filler of FILLER_WORDS) {
    const count = tokens.filter((token) => isSameFiller(token, filler)).length;
    if (count > 0) fillerDetails[filler] = count;
  }

  const repeatedStarts = tokens.reduce((count, token, index) => {
    if (index === 0 || token.length < 2) return count;
    return tokens[index - 1] === token ? count + 1 : count;
  }, 0);
  if (repeatedStarts > 0) fillerDetails["단어 반복"] = repeatedStarts;

  const wordCount = tokens.length;
  const fillerCount = Object.values(fillerDetails).reduce((sum, count) => sum + count, 0);
  const durationMinutes = Math.max(durationSeconds / 60, 1 / 60);
  const speakingRate = Math.round(wordCount / durationMinutes);
  const fillerRate = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0;
  const fillersPerMinute = fillerCount / durationMinutes;
  let pacePenalty = 0;
  if (speakingRate < 90) pacePenalty = Math.min(30, (90 - speakingRate) * 0.35);
  if (speakingRate > 160) pacePenalty = Math.min(30, (speakingRate - 160) * 0.3);
  const fillerPenalty = Math.min(48, fillerRate * 1.8 + fillersPerMinute * 2.5);
  const repetitionPenalty = Math.min(12, repeatedStarts * 2);
  const reliabilityCeiling = durationSeconds < 15 ? 68 : durationSeconds < 30 ? 82 : 100;
  const score = Math.max(
    0,
    Math.min(reliabilityCeiling, Math.round(96 - pacePenalty - fillerPenalty - repetitionPenalty)),
  );

  const goodPoints: string[] = [];
  const improvements: string[] = [];
  if (speakingRate >= 90 && speakingRate <= 160) goodPoints.push("듣는 사람이 따라가기 편한 속도를 유지했어요.");
  else if (speakingRate < 90) improvements.push("문장 사이의 멈춤을 줄여 조금 더 자연스럽게 이어 말해보세요.");
  else improvements.push("핵심 문장 뒤에 짧게 숨을 쉬며 속도를 낮춰보세요.");

  if (fillerCount === 0) goodPoints.push("불필요한 추임새 없이 또렷하게 말했어요.");
  else if (fillerRate <= 4) goodPoints.push("추임새 사용이 적어 전달 흐름이 안정적이에요.");
  else {
    const mostUsed = Object.entries(fillerDetails).sort((a, b) => b[1] - a[1])[0];
    improvements.push(mostUsed ? `‘${mostUsed[0]}’ 대신 1초간 멈춘 뒤 다음 문장을 시작해보세요.` : "추임새 대신 잠깐 멈추는 연습을 해보세요.");
  }
  if (wordCount >= 25) goodPoints.push("분석하기에 충분한 분량으로 연습을 마쳤어요.");
  else improvements.push("다음에는 30초 이상 말해 더 정확한 분석을 받아보세요.");

  const summary = score >= 85
    ? "안정적으로 전달했어요. 지금의 흐름을 유지해보세요."
    : score >= 70
      ? "전체 흐름은 좋아요. 한 가지 습관만 다듬으면 더 선명해집니다."
      : "속도와 추임새를 하나씩 조절하면 전달력이 빠르게 좋아질 수 있어요.";
  return { wordCount, fillerCount, fillerDetails, speakingRate, score, summary, goodPoints, improvements };
}

function isSameFiller(token: string, filler: (typeof FILLER_WORDS)[number]): boolean {
  if (token === filler) return true;
  if (filler === "어") return /^어{2,}$/.test(token);
  if (filler === "음") return /^음{2,}$/.test(token);
  if (filler === "으음") return /^으+음+$/.test(token);
  return false;
}
