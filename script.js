import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
const video = document.getElementById("webcam");
const canvas = document.getElementById("outputCanvas");
const canvasCtx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("statusText");
const timerText = document.getElementById("timerText");
const poseFeedbackList = document.getElementById("poseFeedbackList");
const speechText = document.getElementById("speechText");
const speechFeedback = document.getElementById("speechFeedback");
let poseLandmarker;
let webcamRunning = false;
let recognition;
let startTime = null;
let timerInterval = null;
let lastVideoTime = -1;
const finalReport = document.getElementById("finalReport");
let lookingDownCount = 0;
let tiltedShoulderCount = 0;
let handMotionCount = 0;
let stablePoseCount = 0;
let totalPoseCount = 0;
let finalTranscript = "";
let lastSpeechSpeed = 0;

//모션
async function createPoseLandmarker() {
  statusText.textContent = "모션 AI 불러오는 중...";
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
    },
    runningMode: "VIDEO",
    numPoses: 1
  });

  statusText.textContent = "모션 AI 준비 완료";
}

//캠
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      resolve();
    };
  });
}

//분석 반복
async function predictWebcam() {
  if (!webcamRunning) return;
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const results = poseLandmarker.detectForVideo(video, performance.now());
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      drawPose(landmarks);
      showPoseFeedback(analyzePose(landmarks));
    } else {
      showPoseFeedback(["사람이 잘 보이지 않아요. 카메라 앞에 서 주세요."]);
    }
  }
  requestAnimationFrame(predictWebcam);
}

//관절 선 그리기
function drawPose(landmarks) {
  const drawingUtils = new DrawingUtils(canvasCtx);
  drawingUtils.drawLandmarks(landmarks, {
    radius: 4
  });
  drawingUtils.drawConnectors(
    landmarks,
    PoseLandmarker.POSE_CONNECTIONS
  );
}

//자세 분석
function analyzePose(landmarks) {
  const feedback = [];
  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
  totalPoseCount++;
  let isStable = true;
  if (nose.y > 0.55) {
    feedback.push("고개가 아래로 향하고 있어요. 화면이나 청중 쪽을 봐주세요.");
    lookingDownCount++;
    isStable = false;
  }
  if (shoulderDiff > 0.08) {
    feedback.push("어깨가 한쪽으로 기울어져 있어요. 자세를 조금 펴주세요.");
    tiltedShoulderCount++;
    isStable = false;
  }
  if (leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y) {
    feedback.push("손동작을 사용하고 있어요. 과하지 않으면 발표에 도움이 됩니다.");
    handMotionCount++;
  }
  if (isStable) {
    stablePoseCount++;
  }
  if (feedback.length === 0) {
    feedback.push("자세가 안정적이에요.");
  }
  return feedback;
}

//자세 피드백
function showPoseFeedback(feedbackArray) {
  poseFeedbackList.innerHTML = "";
  feedbackArray.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    poseFeedbackList.appendChild(li);
  });
}

//음성 인식
function startSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    speechFeedback.textContent =
      "이 브라우저는 음성 인식을 지원하지 않아요. 크롬으로 실행해보세요.";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    speechText.textContent = transcript;
    analyzeSpeech(transcript);
  };
  recognition.onerror = (event) => {
    speechFeedback.textContent = "음성 인식 오류: " + event.error;
  };
  recognition.start();
}

//음성 분석
function analyzeSpeech(text) {
  if (!startTime) return;
  finalTranscript = text;
  const seconds = (Date.now() - startTime) / 1000;
  const cleanText = text.replace(/\s/g, "");
  const charCount = cleanText.length;
  if (charCount === 0 || seconds <= 0) {
    return;
  }
  const charsPerMinute = charCount / seconds * 60;
  lastSpeechSpeed = charsPerMinute;
  if (charsPerMinute > 350) {
    speechFeedback.textContent = "말이 조금 빠른 편이에요. 문장 끝에서 잠깐 쉬어주세요.";
  } else if (charsPerMinute < 120) {
    speechFeedback.textContent = "말이 조금 느린 편이에요. 핵심 문장은 조금 더 또렷하게 이어가도 좋아요.";
  } else {
    speechFeedback.textContent = "말 속도가 적절해요.";
  }
}

//타이머
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    timerText.textContent = `${seconds}초`;
  }, 1000);
}

//분석 시작 버튼
startBtn.addEventListener("click", async () => {
  try {
    lookingDownCount = 0;
    tiltedShoulderCount = 0;
    handMotionCount = 0;
    stablePoseCount = 0;
    totalPoseCount = 0;
    finalTranscript = "";
    lastSpeechSpeed = 0;
finalReport.textContent = "발표 분석 중입니다. 종료 버튼을 누르면 최종 리포트가 생성됩니다.";
    statusText.textContent = "준비 중...";
    await createPoseLandmarker();
    await startCamera();
    webcamRunning = true;
    statusText.textContent = "분석 중";
    startTimer();
    startSpeechRecognition();
    predictWebcam();
  } catch (error) {
    console.error(error);
    statusText.textContent = "오류 발생";
    poseFeedbackList.innerHTML = `<li>카메라 또는 마이크 권한을 확인해주세요.</li>`;
  }
});

//분석 종료 버튼
stopBtn.addEventListener("click", () => {
  webcamRunning = false;
  statusText.textContent = "분석 종료";
  createFinalReport();
  if (recognition) {
    recognition.stop();
  }
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
});

//종합 평가
function createFinalReport() {
  if (!startTime) {
    finalReport.textContent = "아직 분석을 시작하지 않았어요.";
    return;
  }
  const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
  const lookingDownRate =
    totalPoseCount > 0 ? lookingDownCount / totalPoseCount : 0;
  const tiltedRate =
    totalPoseCount > 0 ? tiltedShoulderCount / totalPoseCount : 0;
  const stableRate =
    totalPoseCount > 0 ? stablePoseCount / totalPoseCount : 0;
  let score = 100;
  if (lookingDownRate > 0.4) score -= 20;
  else if (lookingDownRate > 0.2) score -= 10;
  if (tiltedRate > 0.3) score -= 15;
  else if (tiltedRate > 0.15) score -= 8;
  if (lastSpeechSpeed > 350) score -= 15;
  else if (lastSpeechSpeed < 120 && lastSpeechSpeed > 0) score -= 10;
  if (finalTranscript.length < 20) score -= 10;
  if (score < 0) score = 0;
  let speedText = "측정 부족";
  if (lastSpeechSpeed > 350) {
    speedText = "빠른 편";
  } else if (lastSpeechSpeed < 120 && lastSpeechSpeed > 0) {
    speedText = "느린 편";
  } else if (lastSpeechSpeed > 0) {
    speedText = "적절함";
  }
  let poseText = "안정적";
  if (stableRate < 0.5) {
    poseText = "개선 필요";
  } else if (stableRate < 0.75) {
    poseText = "보통";
  }
  const feedbackMessages = [];
  if (lookingDownRate > 0.2) {
    feedbackMessages.push("시선이 아래로 향하는 시간이 많았어요. 발표할 때 화면이나 청중 쪽을 더 자주 바라보면 좋아요.");
  }
  if (tiltedRate > 0.15) {
    feedbackMessages.push("어깨가 한쪽으로 기울어지는 순간이 있었어요. 발표 시작 전에 자세를 한 번 정리해보세요.");
  }
  if (lastSpeechSpeed > 350) {
    feedbackMessages.push("말 속도가 빠른 편이에요. 중요한 문장 뒤에는 1초 정도 쉬어가면 전달력이 좋아져요.");
  } else if (lastSpeechSpeed < 120 && lastSpeechSpeed > 0) {
    feedbackMessages.push("말 속도가 느린 편이에요. 핵심 문장은 조금 더 또렷하고 자연스럽게 이어가면 좋아요.");
  }
  if (handMotionCount > totalPoseCount * 0.5) {
    feedbackMessages.push("손동작이 많은 편이에요. 강조하고 싶은 부분에서만 손동작을 쓰면 더 안정적으로 보여요.");
  }
  if (feedbackMessages.length === 0) {
    feedbackMessages.push("전체적으로 안정적인 발표였어요. 지금 흐름을 유지하면 좋아요.");
  }
  finalReport.textContent =
`발표 분석 결과
총 발표 시간: ${totalSeconds}초
최종 점수: ${score}점
자세 안정성: ${poseText}
말 속도: ${speedText}
고개 숙임 비율: ${(lookingDownRate * 100).toFixed(1)}%
어깨 기울어짐 비율: ${(tiltedRate * 100).toFixed(1)}%
손동작 감지 횟수: ${handMotionCount}회
종합 피드백:
- ${feedbackMessages.join("\n- ")}
인식된 발표 내용:
${finalTranscript || "인식된 음성이 없습니다."}`;
}