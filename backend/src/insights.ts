export type AnalysisSnapshot = {
  id: string;
  practiceType: string;
  durationSeconds: number;
  wordCount: number;
  fillerCount: number;
  fillerDetails: string;
  speakingRate: number;
  score: number;
  createdAt: number;
};

export const BADGE_CATALOG = [
  { id: "first-analysis", title: "첫 분석 완료", description: "첫 번째 말하기 분석을 완료했어요.", target: 1, unit: "회" },
  { id: "seven-day-streak", title: "7일 연속 연습", description: "7일 동안 하루도 빠짐없이 연습했어요.", target: 7, unit: "일" },
  { id: "filler-half", title: "말버릇 50% 감소", description: "처음보다 평균 추임새를 절반 이상 줄였어요.", target: 50, unit: "%" },
  { id: "thirty-day-streak", title: "30일 연속 연습", description: "한 달 동안 꾸준히 말하기를 연습했어요.", target: 30, unit: "일" },
  { id: "hundred-analyses", title: "100회 분석 완료", description: "말하기 분석을 100회 완료했어요.", target: 100, unit: "회" },
  { id: "filler-master", title: "말버릇 마스터", description: "최근 3번의 연습에서 추임새를 사용하지 않았어요.", target: 3, unit: "회" },
] as const;

export function buildDashboardSummary(records: AnalysisSnapshot[]) {
  const now = Date.now();
  const weekStart = startOfDay(now - 6 * DAY_MS);
  const previousWeekStart = startOfDay(now - 13 * DAY_MS);
  const thisWeek = records.filter((item) => item.createdAt >= weekStart);
  const previousWeek = records.filter((item) => item.createdAt >= previousWeekStart && item.createdAt < weekStart);
  const latest = records[0];
  const weeklyAverageScore = average(thisWeek.map((item) => item.score));
  const previousAverageScore = average(previousWeek.map((item) => item.score));

  return {
    totalCount: records.length,
    totalDuration: records.reduce((sum, item) => sum + item.durationSeconds, 0),
    weeklyCount: thisWeek.length,
    weeklyFillerCount: thisWeek.reduce((sum, item) => sum + item.fillerCount, 0),
    weeklyAverageScore,
    averageSpeakingRate: average(thisWeek.map((item) => item.speakingRate)),
    scoreDelta: previousWeek.length > 0 ? weeklyAverageScore - previousAverageScore : 0,
    currentStreak: calculateStreak(records),
    latestScore: latest?.score ?? null,
    recent: records.slice(0, 5).map(publicAnalysis),
    daily: buildDailySeries(thisWeek, 7),
  };
}

export function buildGrowthReport(records: AnalysisSnapshot[], period: "week" | "month") {
  const days = period === "week" ? 7 : 30;
  const currentStart = startOfDay(Date.now() - (days - 1) * DAY_MS);
  const previousStart = currentStart - days * DAY_MS;
  const current = records.filter((item) => item.createdAt >= currentStart);
  const previous = records.filter((item) => item.createdAt >= previousStart && item.createdAt < currentStart);
  const currentAverages = metricAverages(current);
  const previousAverages = metricAverages(previous);

  return {
    period,
    count: current.length,
    previousCount: previous.length,
    averages: currentAverages,
    previousAverages,
    changes: {
      score: delta(currentAverages.score, previousAverages.score, previous.length),
      fillerReduction: reduction(previousAverages.fillerCount, currentAverages.fillerCount, previous.length),
      speakingRate: delta(currentAverages.speakingRate, previousAverages.speakingRate, previous.length),
    },
    streakDays: calculateStreak(records),
    daily: buildDailySeries(current, days),
    recent: current.slice(0, 8).map(publicAnalysis),
  };
}

export function buildBadges(records: AnalysisSnapshot[]) {
  const streak = calculateStreak(records);
  const oldestFirst = [...records].reverse();
  const baseline = average(oldestFirst.slice(0, 3).map((item) => item.fillerCount));
  const recentAverage = average(records.slice(0, 3).map((item) => item.fillerCount));
  const fillerReduction = records.length >= 4 && baseline > 0
    ? Math.max(0, Math.round(((baseline - recentAverage) / baseline) * 100))
    : 0;
  const zeroFillerRun = records.slice(0, 3).filter((item) => item.fillerCount === 0).length;
  const values: Record<string, number> = {
    "first-analysis": records.length,
    "seven-day-streak": streak,
    "filler-half": fillerReduction,
    "thirty-day-streak": streak,
    "hundred-analyses": records.length,
    "filler-master": zeroFillerRun,
  };

  return BADGE_CATALOG.map((badge) => {
    const progress = Math.min(badge.target, values[badge.id] ?? 0);
    return {
      ...badge,
      progress,
      earned: progress >= badge.target,
      earnedAt: progress >= badge.target ? earnedDateForBadge(badge.id, records) : null,
    };
  });
}

export function parseFillerDetails(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
    );
  } catch {
    return {};
  }
}

export function calculateStreak(records: AnalysisSnapshot[]): number {
  if (records.length === 0) return 0;
  const days = new Set(records.map((item) => dateKey(item.createdAt)));
  let cursor = startOfDay(Date.now());
  if (!days.has(dateKey(cursor))) cursor -= DAY_MS;
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

function buildDailySeries(records: AnalysisSnapshot[], days: number) {
  const grouped = new Map<string, AnalysisSnapshot[]>();
  for (const record of records) {
    const key = dateKey(record.createdAt);
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }
  const start = startOfDay(Date.now() - (days - 1) * DAY_MS);
  return Array.from({ length: days }, (_, index) => {
    const timestamp = start + index * DAY_MS;
    const values = grouped.get(dateKey(timestamp)) ?? [];
    return {
      date: dateKey(timestamp),
      label: new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" }).format(timestamp),
      count: values.length,
      score: values.length ? average(values.map((item) => item.score)) : null,
      fillerCount: values.reduce((sum, item) => sum + item.fillerCount, 0),
      speakingRate: values.length ? average(values.map((item) => item.speakingRate)) : null,
    };
  });
}

function publicAnalysis(item: AnalysisSnapshot) {
  return {
    id: item.id,
    practiceType: item.practiceType,
    durationSeconds: item.durationSeconds,
    wordCount: item.wordCount,
    fillerCount: item.fillerCount,
    fillerDetails: parseFillerDetails(item.fillerDetails),
    speakingRate: item.speakingRate,
    score: item.score,
    createdAt: item.createdAt,
  };
}

function metricAverages(records: AnalysisSnapshot[]) {
  return {
    score: average(records.map((item) => item.score)),
    fillerCount: average(records.map((item) => item.fillerCount)),
    speakingRate: average(records.map((item) => item.speakingRate)),
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function delta(current: number, previous: number, hasPrevious: number): number {
  return hasPrevious > 0 ? current - previous : 0;
}

function reduction(previous: number, current: number, hasPrevious: number): number {
  if (hasPrevious === 0 || previous === 0) return 0;
  return Math.round(((previous - current) / previous) * 100);
}

function earnedDateForBadge(id: string, records: AnalysisSnapshot[]): number | null {
  if (records.length === 0) return null;
  if (id === "first-analysis") return records[records.length - 1]?.createdAt ?? null;
  return records[0]?.createdAt ?? null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(value: number): number {
  const key = dateKey(value);
  return new Date(`${key}T00:00:00+09:00`).getTime();
}

function dateKey(value: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(value);
}
