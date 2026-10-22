import type { Category, FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

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

type Point = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

const SAMPLE_INTERVAL_MS = 300;

export class MotionAnalyzer {
  private readonly faceLandmarker: FaceLandmarker;
  private readonly poseLandmarker: PoseLandmarker;
  private lastSampleAt = -Infinity;
  private sampleCount = 0;
  private faceFrames = 0;
  private eyeContactFrames = 0;
  private poseFrames = 0;
  private alignedPoseFrames = 0;
  private stablePoseFrames = 0;
  private expressionFrames = 0;
  private smilingFrames = 0;
  private tenseExpressionFrames = 0;
  private expressionMovementTotal = 0;
  private expressionMovementSamples = 0;
  private shoulderTiltEvents = 0;
  private headTurnEvents = 0;
  private shoulderTiltActive = false;
  private headTurnActive = false;
  private previousTorsoCenter: Point | null = null;
  private previousExpressionVector: number[] | null = null;

  private constructor(faceLandmarker: FaceLandmarker, poseLandmarker: PoseLandmarker) {
    this.faceLandmarker = faceLandmarker;
    this.poseLandmarker = poseLandmarker;
  }

  static async create(): Promise<MotionAnalyzer> {
    const { FaceLandmarker, FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const [faceLandmarker, poseLandmarker] = await Promise.all([
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "/mediapipe/models/face_landmarker.task" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputFaceBlendshapes: true,
      }),
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "/mediapipe/models/pose_landmarker_lite.task" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      }),
    ]);
    return new MotionAnalyzer(faceLandmarker, poseLandmarker);
  }

  sample(video: HTMLVideoElement, timestampMs: number): void {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (timestampMs - this.lastSampleAt < SAMPLE_INTERVAL_MS) return;
    this.lastSampleAt = timestampMs;
    this.sampleCount += 1;

    const faceResult = this.faceLandmarker.detectForVideo(video, timestampMs);
    const face = faceResult.faceLandmarks[0];
    if (face) this.processFace(face);
    else this.setHeadTurn(false);
    const blendshapes = faceResult.faceBlendshapes[0]?.categories;
    if (blendshapes?.length) this.processExpression(blendshapes);

    const pose = this.poseLandmarker.detectForVideo(video, timestampMs).landmarks[0];
    if (pose) this.processPose(pose);
    else {
      this.previousTorsoCenter = null;
      this.setShoulderTilt(false);
    }
  }

  result(): MotionAnalysisResult | null {
    if (this.sampleCount < 5) return null;
    const facePresenceRate = percent(this.faceFrames, this.sampleCount);
    const eyeContactRate = percent(this.eyeContactFrames, Math.max(1, this.faceFrames));
    const postureRate = percent(this.alignedPoseFrames, Math.max(1, this.poseFrames));
    const stabilityScore = percent(this.stablePoseFrames, Math.max(1, this.poseFrames - 1));
    const hasExpressionAnalysis = this.expressionFrames >= 3;
    const smileRate = hasExpressionAnalysis ? percent(this.smilingFrames, this.expressionFrames) : null;
    const tenseExpressionRate = hasExpressionAnalysis ? percent(this.tenseExpressionFrames, this.expressionFrames) : null;
    const expressionVariationScore = hasExpressionAnalysis
      ? variationScore(this.expressionMovementTotal / Math.max(1, this.expressionMovementSamples))
      : null;
    const expressionScore = hasExpressionAnalysis
      ? clamp(Math.round((100 - tenseExpressionRate!) * 0.7 + expressionVariationScore! * 0.3))
      : null;
    const score = expressionScore === null
      ? clamp(Math.round(
        facePresenceRate * 0.15
        + eyeContactRate * 0.35
        + postureRate * 0.3
        + stabilityScore * 0.2,
      ))
      : clamp(Math.round(
        facePresenceRate * 0.1
        + eyeContactRate * 0.25
        + postureRate * 0.25
        + stabilityScore * 0.15
        + expressionScore * 0.25,
      ));

    const goodPoints: string[] = [];
    const improvements: string[] = [];
    if (facePresenceRate >= 90) goodPoints.push("연습하는 동안 얼굴이 화면에 안정적으로 잡혔어요.");
    else improvements.push("얼굴 전체가 화면 중앙에 들어오도록 카메라 각도를 조정해보세요.");
    if (eyeContactRate >= 70) goodPoints.push("카메라를 바라보는 시간이 충분해 전달력이 안정적이었어요.");
    else improvements.push("화면 대신 카메라 렌즈를 바라보는 시간을 조금씩 늘려보세요.");
    if (postureRate >= 75) goodPoints.push("어깨와 머리의 정렬이 안정적으로 유지됐어요.");
    else improvements.push("양쪽 어깨 높이를 맞추고 머리를 상체 중앙에 두어보세요.");
    if (stabilityScore >= 75) goodPoints.push("상체가 과도하게 흔들리지 않고 안정적이었어요.");
    else improvements.push("핵심 문장을 말할 때 상체를 고정하고 동작을 천천히 해보세요.");
    if (expressionScore !== null) {
      if (expressionScore >= 75) goodPoints.push("표정이 과하게 굳지 않고 자연스럽게 변했어요.");
      else if (tenseExpressionRate! >= 35) improvements.push("문장 사이에 짧게 호흡하며 눈썹과 입 주변의 힘을 풀어보세요.");
      else improvements.push("핵심 단어에서 눈썹과 입꼬리를 조금 더 자연스럽게 활용해보세요.");
    }

    return {
      sampleCount: this.sampleCount,
      facePresenceRate,
      eyeContactRate,
      postureRate,
      stabilityScore,
      expressionScore,
      smileRate,
      tenseExpressionRate,
      expressionVariationScore,
      shoulderTiltEvents: this.shoulderTiltEvents,
      headTurnEvents: this.headTurnEvents,
      score,
      goodPoints: goodPoints.slice(0, 3),
      improvements: improvements.slice(0, 3),
    };
  }

  close(): void {
    this.faceLandmarker.close();
    this.poseLandmarker.close();
  }

  private processFace(landmarks: Point[]): void {
    const nose = landmarks[1];
    const outerRightEye = landmarks[33];
    const outerLeftEye = landmarks[263];
    if (!nose || !outerRightEye || !outerLeftEye) return;
    const eyeDistance = distance(outerRightEye, outerLeftEye);
    if (eyeDistance < 0.03) return;

    this.faceFrames += 1;
    const eyeMidpoint = midpoint(outerRightEye, outerLeftEye);
    const headYaw = Math.abs(nose.x - eyeMidpoint.x) / eyeDistance;
    const rightIrisCentered = isIrisCentered(landmarks[468], landmarks[33], landmarks[133]);
    const leftIrisCentered = isIrisCentered(landmarks[473], landmarks[362], landmarks[263]);
    const lookingForward = headYaw <= 0.2 && rightIrisCentered && leftIrisCentered;
    if (lookingForward) this.eyeContactFrames += 1;
    this.setHeadTurn(!lookingForward);
  }

  private processPose(landmarks: Point[]): void {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    if (!isVisible(nose) || !isVisible(leftShoulder) || !isVisible(rightShoulder)) return;
    const shoulderWidth = distance(leftShoulder, rightShoulder);
    if (shoulderWidth < 0.08) return;

    this.poseFrames += 1;
    const shoulderCenter = midpoint(leftShoulder, rightShoulder);
    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth;
    const headOffset = Math.abs(nose.x - shoulderCenter.x) / shoulderWidth;
    const aligned = shoulderTilt <= 0.12 && headOffset <= 0.26;
    if (aligned) this.alignedPoseFrames += 1;
    this.setShoulderTilt(shoulderTilt > 0.12);

    if (this.previousTorsoCenter) {
      const movement = distance(shoulderCenter, this.previousTorsoCenter) / shoulderWidth;
      if (movement <= 0.075) this.stablePoseFrames += 1;
    }
    this.previousTorsoCenter = shoulderCenter;
  }

  private processExpression(categories: Category[]): void {
    const scores = new Map(categories.map((category) => [category.categoryName, category.score]));
    const smile = averageBlendshape(scores, "mouthSmileLeft", "mouthSmileRight");
    const browTension = averageBlendshape(scores, "browDownLeft", "browDownRight");
    const mouthTension = averageBlendshape(scores, "mouthPressLeft", "mouthPressRight");
    const expressionVector = [
      smile,
      scoreOf(scores, "browInnerUp"),
      averageBlendshape(scores, "browOuterUpLeft", "browOuterUpRight"),
      browTension,
      averageBlendshape(scores, "cheekSquintLeft", "cheekSquintRight"),
      averageBlendshape(scores, "mouthFrownLeft", "mouthFrownRight"),
    ];

    this.expressionFrames += 1;
    if (smile >= 0.35) this.smilingFrames += 1;
    if (Math.max(browTension, mouthTension) >= 0.55) this.tenseExpressionFrames += 1;
    if (this.previousExpressionVector) {
      const movement = expressionVector.reduce(
        (sum, value, index) => sum + Math.abs(value - this.previousExpressionVector![index]!),
        0,
      ) / expressionVector.length;
      this.expressionMovementTotal += movement;
      this.expressionMovementSamples += 1;
    }
    this.previousExpressionVector = expressionVector;
  }

  private setShoulderTilt(active: boolean): void {
    if (active && !this.shoulderTiltActive) this.shoulderTiltEvents += 1;
    this.shoulderTiltActive = active;
  }

  private setHeadTurn(active: boolean): void {
    if (active && !this.headTurnActive) this.headTurnEvents += 1;
    this.headTurnActive = active;
  }
}

function isIrisCentered(iris: Point | undefined, firstCorner: Point | undefined, secondCorner: Point | undefined): boolean {
  if (!iris || !firstCorner || !secondCorner) return false;
  const minimum = Math.min(firstCorner.x, secondCorner.x);
  const width = Math.abs(firstCorner.x - secondCorner.x);
  if (width < 0.005) return false;
  const position = (iris.x - minimum) / width;
  return position >= 0.25 && position <= 0.75;
}

function isVisible(point: Point | undefined): point is Point {
  return Boolean(point && (point.visibility ?? 1) >= 0.45);
}

function midpoint(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function percent(value: number, total: number): number {
  return clamp(Math.round((value / total) * 100));
}

function scoreOf(scores: Map<string, number>, name: string): number {
  return scores.get(name) ?? 0;
}

function averageBlendshape(scores: Map<string, number>, first: string, second: string): number {
  return (scoreOf(scores, first) + scoreOf(scores, second)) / 2;
}

function variationScore(averageMovement: number): number {
  if (averageMovement <= 0.012) return clamp(Math.round(50 + (averageMovement / 0.012) * 20));
  if (averageMovement <= 0.07) return clamp(Math.round(70 + ((averageMovement - 0.012) / 0.058) * 30));
  if (averageMovement <= 0.16) return 100;
  return clamp(Math.round(100 - ((averageMovement - 0.16) / 0.2) * 35));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
