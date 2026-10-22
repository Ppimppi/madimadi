export type MotionAnalysisResult = {
  sampleCount: number;
  facePresenceRate: number;
  eyeContactRate: number;
  postureRate: number;
  stabilityScore: number;
  expressionScore: number | null;
  smileRate: number | null;
  tenseExpressionRate: number | null;
  expressionVariationScore: number | null;
  shoulderTiltEvents: number;
  headTurnEvents: number;
  score: number;
  goodPoints: string[];
  improvements: string[];
};

type QueryValue = string | string[] | undefined;

export function parseMotionAnalysis(query: Record<string, QueryValue>): MotionAnalysisResult | null {
  const sampleCount = integer(query.motionSampleCount, 5, 10_000);
  const facePresenceRate = integer(query.facePresenceRate, 0, 100);
  const eyeContactRate = integer(query.eyeContactRate, 0, 100);
  const postureRate = integer(query.postureRate, 0, 100);
  const stabilityScore = integer(query.stabilityScore, 0, 100);
  const smileRate = optionalInteger(query.smileRate, 0, 100);
  const tenseExpressionRate = optionalInteger(query.tenseExpressionRate, 0, 100);
  const expressionVariationScore = optionalInteger(query.expressionVariationScore, 0, 100);
  const shoulderTiltEvents = integer(query.shoulderTiltEvents, 0, 10_000);
  const headTurnEvents = integer(query.headTurnEvents, 0, 10_000);
  if ([sampleCount, facePresenceRate, eyeContactRate, postureRate, stabilityScore, shoulderTiltEvents, headTurnEvents].some((value) => value === null)) {
    return null;
  }

  const hasExpressionAnalysis = smileRate !== null && tenseExpressionRate !== null && expressionVariationScore !== null;
  const expressionScore = hasExpressionAnalysis
    ? clamp(Math.round((100 - tenseExpressionRate) * 0.7 + expressionVariationScore * 0.3))
    : null;
  const score = expressionScore === null
    ? clamp(Math.round(
      facePresenceRate! * 0.15
      + eyeContactRate! * 0.35
      + postureRate! * 0.3
      + stabilityScore! * 0.2,
    ))
    : clamp(Math.round(
      facePresenceRate! * 0.1
      + eyeContactRate! * 0.25
      + postureRate! * 0.25
      + stabilityScore! * 0.15
      + expressionScore * 0.25,
    ));
  const goodPoints: string[] = [];
  const improvements: string[] = [];
  if (facePresenceRate! >= 90) goodPoints.push("연습하는 동안 얼굴이 화면에 안정적으로 잡혔어요.");
  else improvements.push("얼굴 전체가 화면 중앙에 들어오도록 카메라 각도를 조정해보세요.");
  if (eyeContactRate! >= 70) goodPoints.push("카메라를 바라보는 시간이 충분해 전달력이 안정적이었어요.");
  else improvements.push("화면 대신 카메라 렌즈를 바라보는 시간을 조금씩 늘려보세요.");
  if (postureRate! >= 75) goodPoints.push("어깨와 머리의 정렬이 안정적으로 유지됐어요.");
  else improvements.push("양쪽 어깨 높이를 맞추고 머리를 상체 중앙에 두어보세요.");
  if (stabilityScore! >= 75) goodPoints.push("상체가 과도하게 흔들리지 않고 안정적이었어요.");
  else improvements.push("핵심 문장을 말할 때 상체를 고정하고 동작을 천천히 해보세요.");
  if (expressionScore !== null) {
    if (expressionScore >= 75) goodPoints.push("표정이 과하게 굳지 않고 자연스럽게 변했어요.");
    else if (tenseExpressionRate! >= 35) improvements.push("문장 사이에 짧게 호흡하며 눈썹과 입 주변의 힘을 풀어보세요.");
    else improvements.push("핵심 단어에서 눈썹과 입꼬리를 조금 더 자연스럽게 활용해보세요.");
  }

  return {
    sampleCount: sampleCount!,
    facePresenceRate: facePresenceRate!,
    eyeContactRate: eyeContactRate!,
    postureRate: postureRate!,
    stabilityScore: stabilityScore!,
    expressionScore,
    smileRate,
    tenseExpressionRate,
    expressionVariationScore,
    shoulderTiltEvents: shoulderTiltEvents!,
    headTurnEvents: headTurnEvents!,
    score,
    goodPoints: goodPoints.slice(0, 3),
    improvements: improvements.slice(0, 3),
  };
}

export function parseStoredMotionAnalysis(value: string | null | undefined): MotionAnalysisResult | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<MotionAnalysisResult>;
    if (!parsed || typeof parsed !== "object") return null;
    const query: Record<string, QueryValue> = {
      motionSampleCount: String(parsed.sampleCount),
      facePresenceRate: String(parsed.facePresenceRate),
      eyeContactRate: String(parsed.eyeContactRate),
      postureRate: String(parsed.postureRate),
      stabilityScore: String(parsed.stabilityScore),
      smileRate: optionalString(parsed.smileRate),
      tenseExpressionRate: optionalString(parsed.tenseExpressionRate),
      expressionVariationScore: optionalString(parsed.expressionVariationScore),
      shoulderTiltEvents: String(parsed.shoulderTiltEvents),
      headTurnEvents: String(parsed.headTurnEvents),
    };
    return parseMotionAnalysis(query);
  } catch {
    return null;
  }
}

function integer(value: QueryValue, minimum: number, maximum: number): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function optionalInteger(value: QueryValue, minimum: number, maximum: number): number | null {
  if (value === undefined || value === "undefined" || value === "null") return null;
  return integer(value, minimum, maximum);
}

function optionalString(value: number | null | undefined): string | undefined {
  return typeof value === "number" ? String(value) : undefined;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
