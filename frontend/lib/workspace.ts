export type CurrentUser = { id: string; name: string; email: string; goals: string[] };

export type AnalysisSummaryItem = {
  id: string;
  practiceType: string;
  durationSeconds: number;
  wordCount: number;
  fillerCount: number;
  fillerDetails: Record<string, number>;
  speakingRate: number;
  score: number;
  createdAt: number;
};

export type DailyAnalysisPoint = {
  date: string;
  label: string;
  count: number;
  score: number | null;
  fillerCount: number;
  speakingRate: number | null;
};

export type DashboardSummary = {
  totalCount: number;
  totalDuration: number;
  weeklyCount: number;
  weeklyFillerCount: number;
  weeklyAverageScore: number;
  averageSpeakingRate: number;
  scoreDelta: number;
  currentStreak: number;
  latestScore: number | null;
  recent: AnalysisSummaryItem[];
  daily: DailyAnalysisPoint[];
};

export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}
