export const PRACTICE_TYPES = ["자유 말하기", "면접", "발표", "회의"] as const;

export type PracticeType = (typeof PRACTICE_TYPES)[number];

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
