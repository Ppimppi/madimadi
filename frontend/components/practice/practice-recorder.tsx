"use client";

import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  Gauge,
  MessageCircleWarning,
  PersonStanding,
  Play,
  RotateCcw,
  Save,
  Smile,
  Sparkles,
  Square,
  Target,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MotionAnalyzer, type MotionAnalysisResult } from "@/lib/motion-analysis";
import { PRACTICE_TYPES, type PracticeType, type SpeechAnalysisResult } from "@/lib/speech-analysis";

type RecorderStatus = "idle" | "recording" | "recorded" | "analyzing" | "complete";

type SavedAnalysis = SpeechAnalysisResult & {
  id: string;
  practiceType: PracticeType;
  transcript: string;
  durationSeconds: number;
  createdAt: number;
};

type AnalysisComparisonMetric = {
  key: string;
  label: string;
  before: number;
  after: number;
  unit: string;
  delta: number;
  improved: boolean | null;
};

type AnalysisComparison = {
  previousId: string;
  previousCreatedAt: number;
  practiceType: PracticeType;
  summary: string;
  metrics: AnalysisComparisonMetric[];
};

type RecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
};

type RecognitionErrorEventLike = {
  error: string;
};

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => RecognitionLike;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

type PracticeRecorderProps = {
  initialPracticeType?: PracticeType;
  lockedType?: boolean;
  intro?: ReactNode;
  scenarioPrompt?: string;
  variant?: "default" | "scenario";
};

const waveformBars = [
  10, 15, 23, 32, 43, 29, 20, 36, 49, 34, 24, 41,
  54, 39, 27, 19, 14, 22, 33, 46, 31, 21, 38, 51,
  43, 29, 19, 15, 25, 40, 52, 36, 24, 18, 31, 45,
  37, 26, 19, 15, 23, 34, 28, 20, 15, 11,
];

export function PracticeRecorder({
  initialPracticeType = "자유 말하기",
  lockedType = false,
  intro,
  scenarioPrompt,
  variant = "default",
}: PracticeRecorderProps = {}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [practiceType, setPracticeType] = useState<PracticeType>(initialPracticeType);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [motionLoading, setMotionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<SavedAnalysis | null>(null);
  const [comparison, setComparison] = useState<AnalysisComparison | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const motionAnalyzerRef = useRef<MotionAnalyzer | null>(null);
  const motionAnimationRef = useRef<number | null>(null);
  const motionResultRef = useRef<MotionAnalysisResult | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRestartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const finalTranscriptRef = useRef("");
  const shouldRecognizeRef = useRef(false);
  const startingRef = useRef(false);
  const statusRef = useRef<RecorderStatus>("idle");

  const changeStatus = useCallback((nextStatus: RecorderStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRecognitionRestart = useCallback(() => {
    if (recognitionRestartRef.current) {
      clearTimeout(recognitionRestartRef.current);
      recognitionRestartRef.current = null;
    }
  }, []);

  const stopMotionAnalysis = useCallback(() => {
    if (motionAnimationRef.current !== null) {
      cancelAnimationFrame(motionAnimationRef.current);
      motionAnimationRef.current = null;
    }
    const analyzer = motionAnalyzerRef.current;
    motionAnalyzerRef.current = null;
    analyzer?.close();
  }, []);

  const startMotionAnalysis = useCallback(() => {
    let failed = false;
    const run = (timestamp: number) => {
      const analyzer = motionAnalyzerRef.current;
      const video = liveVideoRef.current;
      if (!analyzer || statusRef.current !== "recording") return;
      if (video) {
        try {
          analyzer.sample(video, timestamp);
        } catch {
          if (!failed) {
            failed = true;
            setNotice("영상 분석이 중단되어 음성만 분석합니다.");
          }
        }
      }
      motionAnimationRef.current = requestAnimationFrame(run);
    };
    motionAnimationRef.current = requestAnimationFrame(run);
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      clearRecognitionRestart();
      stopMotionAnalysis();
      shouldRecognizeRef.current = false;
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearRecognitionRestart, clearTimer, stopMotionAnalysis]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = liveVideoRef.current;
    const stream = streamRef.current;
    if (!cameraActive || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setNotice("카메라 미리보기를 시작하지 못했습니다."));
    return () => {
      video.srcObject = null;
    };
  }, [cameraActive]);

  const stopRecording = useCallback(() => {
    if (statusRef.current !== "recording") return;

    const recorder = recorderRef.current;
    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));

    clearTimer();
    clearRecognitionRestart();
    shouldRecognizeRef.current = false;
    setSeconds(duration);
    changeStatus("recorded");

    motionResultRef.current = motionAnalyzerRef.current?.result() ?? null;
    stopMotionAnalysis();

    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
    }

    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") videoRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, [changeStatus, clearRecognitionRestart, clearTimer, stopMotionAnalysis]);

  useEffect(() => {
    if (status !== "recording") {
      clearTimer();
      return;
    }

    const updateElapsedTime = () => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSeconds(Math.min(elapsed, 300));
      if (elapsed >= 300) stopRecording();
    };

    updateElapsedTime();
    timerRef.current = setInterval(updateElapsedTime, 250);
    return clearTimer;
  }, [clearTimer, status, stopRecording]);

  async function startRecording() {
    if (startingRef.current || statusRef.current === "recording") return;
    startingRef.current = true;
    setError("");
    setNotice("");
    setResult(null);
    setComparison(null);
    setTranscript("");
    setAudioBlob(null);
    finalTranscriptRef.current = "";
    chunksRef.current = [];
    videoChunksRef.current = [];
    motionResultRef.current = null;
    stopMotionAnalysis();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("이 브라우저에서는 마이크 녹음을 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해주세요.");
      startingRef.current = false;
      return;
    }

    try {
      let stream: MediaStream;
      if (cameraEnabled) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: preferredAudioConstraints(),
            video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: preferredAudioConstraints() });
          setNotice("카메라를 사용할 수 없어 이번 연습은 음성만 분석합니다.");
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: preferredAudioConstraints() });
      }
      streamRef.current = stream;
      const hasCamera = stream.getVideoTracks().length > 0;
      setCameraActive(hasCamera);

      if (hasCamera) {
        setMotionLoading(true);
        try {
          motionAnalyzerRef.current = await MotionAnalyzer.create();
        } catch {
          setNotice("동작 분석 모델을 불러오지 못해 영상 녹화와 음성 분석만 진행합니다.");
        } finally {
          setMotionLoading(false);
        }
      }

      const audioStream = new MediaStream(stream.getAudioTracks());
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(audioStream, { audioBitsPerSecond: 64_000 });
      } catch {
        recorder = new MediaRecorder(audioStream);
      }
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        if (statusRef.current === "recording") stopRecording();
      };

      if (hasCamera) {
        const videoMimeType = supportedVideoMimeType();
        const videoRecorder = videoMimeType
          ? new MediaRecorder(stream, { mimeType: videoMimeType, videoBitsPerSecond: 1_200_000 })
          : new MediaRecorder(stream);
        videoRecorderRef.current = videoRecorder;
        videoRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) videoChunksRef.current.push(event.data);
        };
        videoRecorder.onstop = () => {
          if (videoChunksRef.current.length === 0) return;
          const blob = new Blob(videoChunksRef.current, { type: videoRecorder.mimeType || "video/webm" });
          setVideoUrl(URL.createObjectURL(blob));
        };
      }

      startedAtRef.current = Date.now();
      setSeconds(0);
      changeStatus("recording");
      recorder.start(250);
      videoRecorderRef.current?.start(250);
      if (motionAnalyzerRef.current) startMotionAnalysis();

      const recognitionWindow = window as typeof window & {
        SpeechRecognition?: RecognitionConstructor;
        webkitSpeechRecognition?: RecognitionConstructor;
      };
      const Recognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "ko-KR";
        recognition.onresult = (event) => {
          let finalText = finalTranscriptRef.current;
          let interimText = "";
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const item = event.results[index];
            const text = item[0].transcript.trim();
            if (item.isFinal) finalText = `${finalText} ${text}`.trim();
            else interimText = `${interimText} ${text}`.trim();
          }
          finalTranscriptRef.current = finalText;
          setTranscript(`${finalText} ${interimText}`.trim());
        };
        recognition.onerror = (event) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            shouldRecognizeRef.current = false;
            setNotice("브라우저에서 실시간 받아쓰기가 차단되었습니다. 주소창의 마이크 권한을 허용해주세요.");
            return;
          }
          if (event.error !== "aborted" && event.error !== "no-speech") {
            setNotice(`실시간 받아쓰기가 중단되었습니다(${event.error}). 녹음 후 직접 수정할 수 있어요.`);
          }
        };
        recognition.onend = () => {
          if (shouldRecognizeRef.current) {
            clearRecognitionRestart();
            recognitionRestartRef.current = setTimeout(() => {
              if (!shouldRecognizeRef.current) return;
              try {
                recognition.start();
              } catch {
                setNotice("실시간 받아쓰기를 다시 시작하지 못했습니다. 녹음 후 직접 수정할 수 있어요.");
              }
            }, 250);
          }
        };
        recognitionRef.current = recognition;
        shouldRecognizeRef.current = true;
        recognition.start();
      } else {
        setNotice("이 브라우저는 자동 받아쓰기를 지원하지 않습니다. 녹음 후 내용을 직접 입력해주세요.");
      }
    } catch {
      setError("마이크 권한을 허용해야 연습을 시작할 수 있습니다. 영상 분석을 사용하려면 카메라도 허용해주세요.");
      setMotionLoading(false);
      clearTimer();
      clearRecognitionRestart();
      stopMotionAnalysis();
      shouldRecognizeRef.current = false;
      recognitionRef.current?.abort();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
        videoRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
      changeStatus("idle");
    } finally {
      startingRef.current = false;
    }
  }

  function resetPractice() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setTranscript("");
    setSeconds(0);
    setResult(null);
    setComparison(null);
    setError("");
    setNotice("");
    setMotionLoading(false);
    clearTimer();
    clearRecognitionRestart();
    stopMotionAnalysis();
    shouldRecognizeRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    recorderRef.current = null;
    videoRecorderRef.current = null;
    motionResultRef.current = null;
    setCameraActive(false);
    changeStatus("idle");
    finalTranscriptRef.current = "";
  }

  async function saveAndAnalyze() {
    if (seconds < 3) {
      setError("3초 이상 말한 뒤 분석해주세요.");
      return;
    }
    if (!audioBlob || audioBlob.size === 0) {
      setError("녹음 파일을 준비하고 있습니다. 잠시 후 다시 눌러주세요.");
      return;
    }

    changeStatus("analyzing");
    setError("");
    try {
      const query = new URLSearchParams({
        durationSeconds: String(seconds),
        practiceType,
      });
      if (scenarioPrompt?.trim()) query.set("prompt", scenarioPrompt.trim());
      const motion = motionResultRef.current;
      if (motion) {
        query.set("motionSampleCount", String(motion.sampleCount));
        query.set("facePresenceRate", String(motion.facePresenceRate));
        query.set("eyeContactRate", String(motion.eyeContactRate));
        query.set("postureRate", String(motion.postureRate));
        query.set("stabilityScore", String(motion.stabilityScore));
        if (motion.smileRate !== null) query.set("smileRate", String(motion.smileRate));
        if (motion.tenseExpressionRate !== null) query.set("tenseExpressionRate", String(motion.tenseExpressionRate));
        if (motion.expressionVariationScore !== null) query.set("expressionVariationScore", String(motion.expressionVariationScore));
        query.set("shoulderTiltEvents", String(motion.shoulderTiltEvents));
        query.set("headTurnEvents", String(motion.headTurnEvents));
      }
      const response = await fetch(`/api/analyses?${query.toString()}`, {
        method: "POST",
        headers: { "Content-Type": audioBlob.type || "audio/webm" },
        body: audioBlob,
      });
      const data = (await response.json()) as { analysis?: SavedAnalysis; comparison?: AnalysisComparison | null; error?: string };
      if (!response.ok || !data.analysis) throw new Error(data.error || "분석에 실패했습니다.");
      setTranscript(data.analysis.transcript);
      finalTranscriptRef.current = data.analysis.transcript;
      setResult(data.analysis);
      setComparison(data.comparison ?? null);
      changeStatus("complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "분석 중 문제가 발생했습니다.");
      changeStatus("recorded");
    }
  }

  return (
    <div className={`practice-workspace ${variant === "scenario" ? "is-scenario" : ""}`}>
      <section className="practice-recorder-card">
        {intro}
        <div className={`practice-options ${lockedType ? "is-locked" : ""} ${lockedType && variant === "default" ? "is-analysis-header" : ""}`}>
          {lockedType && variant === "default" && (
            <h2 className="practice-analysis-title">새로운 분석</h2>
          )}
          {!lockedType && <div>
            <label htmlFor="practice-type">연습 상황</label>
            <select
              id="practice-type"
              className="practice-select"
              value={practiceType}
              onChange={(event) => setPracticeType(event.target.value as PracticeType)}
              disabled={lockedType || status === "recording" || status === "analyzing"}
            >
              {PRACTICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>}
          <span className={`recording-state ${status === "recording" ? "is-live" : ""}`}>
            <i /> {motionLoading ? "모델 준비 중" : status === "recording" ? (cameraActive ? "영상 분석 중" : "녹음 중") : status === "complete" ? "분석 완료" : "준비됨"}
          </span>
        </div>

        <div className="camera-control">
          <div><Camera aria-hidden="true" /><span><strong>카메라 모션 분석</strong><small>영상은 서버에 저장되지 않아요.</small></span></div>
          <Switch
            checked={cameraEnabled}
            onCheckedChange={setCameraEnabled}
            disabled={status !== "idle" || motionLoading}
            aria-label="카메라 모션 분석 사용"
          />
        </div>

        {cameraActive ? (
          <div className="camera-preview is-live">
            <video ref={liveVideoRef} autoPlay muted playsInline aria-label="실시간 카메라 미리보기" />
            <span><i /> MediaPipe 분석 중</span>
          </div>
        ) : videoUrl ? (
          <video className="camera-preview recorded-video" controls playsInline src={videoUrl}>녹화 영상을 재생할 수 없습니다.</video>
        ) : (
          <div className="recorder-visual" aria-hidden="true">
            <div className="recorder-waveform">
              {waveformBars.map((height, index) => <i key={index} style={{ height }} />)}
            </div>
          </div>
        )}

        <div className="recording-control-stack">
          <strong className="recording-time" aria-live="polite">{formatTime(seconds)}<small> / 05:00</small></strong>
          {status === "idle" && (
            <Button
              className="record-control is-start"
              onClick={startRecording}
              disabled={motionLoading}
              aria-label={cameraEnabled ? "영상 분석 시작" : "음성 분석 시작"}
            >
              <Play aria-hidden="true" fill="currentColor" />
            </Button>
          )}
          {status === "recording" && (
            <Button className="record-control is-stop" onClick={stopRecording} aria-label="녹음 종료">
              <Square aria-hidden="true" fill="currentColor" />
            </Button>
          )}
          {(status === "idle" || status === "recording") && (
            <span className="record-control-label">
              {motionLoading
                ? "모델 준비 중…"
                : status === "recording"
                  ? cameraActive ? "영상 분석 중…" : "음성 분석 중…"
                  : cameraEnabled ? "영상 분석 시작" : "음성 분석 시작"}
            </span>
          )}
        </div>
        <p className="recording-guide">
          {status === "recording"
            ? "평소 말하듯 자연스럽게 이야기하세요. 최대 5분까지 녹음됩니다."
            : status === "idle"
              ? "버튼을 누르고 30초 이상 말하면 더 정확하게 분석할 수 있어요."
              : "녹음을 들어보고 받아쓰기 내용을 확인한 뒤 분석을 시작하세요."}
        </p>

        <div className="recorder-actions">
          {(status === "recorded" || status === "complete") && <Button variant="outline" onClick={resetPractice}><RotateCcw />다시 녹음</Button>}
          {status === "recorded" && <Button className="record-primary" onClick={saveAndAnalyze} disabled={!audioBlob}><Sparkles />분석하고 저장</Button>}
          {status === "analyzing" && <Button className="record-primary" disabled><Save />분석 중…</Button>}
        </div>

        {audioUrl && !videoUrl && <audio className="practice-audio" controls src={audioUrl}>녹음된 오디오를 재생할 수 없습니다.</audio>}
        {notice && <p className="practice-notice"><Volume2 />{notice}</p>}
        {error && <p className="practice-error" role="alert"><MessageCircleWarning />{error}</p>}
      </section>

      <section className="transcript-card">
        <div className="section-heading">
          <div><span>받아쓰기</span><h2>말한 내용</h2></div>
          <small>{transcript.trim().length.toLocaleString()}자</small>
        </div>
        <textarea
          value={transcript}
          onChange={(event) => {
            setTranscript(event.target.value);
            finalTranscriptRef.current = event.target.value;
          }}
          disabled={status === "analyzing"}
          placeholder="녹음 중에는 실시간 자막이 표시되고, 분석 후에는 AI가 음성 원본에서 만든 정확한 받아쓰기로 교체됩니다."
          aria-label="녹음 받아쓰기 내용"
        />
      </section>

      {result && (
        <section className="analysis-result" aria-live="polite">
          <div className="result-score">
            <span>종합 점수</span>
            <strong>{result.score}<small>점</small></strong>
            <p>{result.summary}</p>
            {(result.contentEvaluation || result.motion) && (
              <small className="score-breakdown">
                말하기 습관 {result.speechScore}점
                {result.contentEvaluation && ` · 내용 ${result.contentEvaluation.score}점`}
                {result.motion && ` · 영상 ${result.motion.score}점`}
              </small>
            )}
          </div>
          <div className="result-metrics">
            <article><Gauge /><span>말하기 속도</span><strong>{result.speakingRate}<small> 어절/분</small></strong></article>
            <article><MessageCircleWarning /><span>추임새</span><strong>{result.fillerCount}<small> 회</small></strong></article>
            <article><Volume2 /><span>말한 분량</span><strong>{result.wordCount}<small> 어절</small></strong></article>
            {result.contentEvaluation && <article><Target /><span>내용 적합성</span><strong>{result.contentEvaluation.score}<small> 점</small></strong></article>}
          </div>
          <div className="result-feedback-grid">
            <article>
              <h3><CheckCircle2 />잘한 점</h3>
              <ul>{result.goodPoints.map((point) => <li key={point}>{point}</li>)}</ul>
            </article>
            <article>
              <h3><Sparkles />다음 연습</h3>
              <ul>{result.improvements.map((point) => <li key={point}>{point}</li>)}</ul>
            </article>
          </div>
          {result.contentEvaluation && (
            <div className="content-result-panel">
              <div className="content-result-heading">
                <Target />
                <div><span>질문 적합성 분석</span><strong>{result.contentEvaluation.summary}</strong></div>
                <b>{result.contentEvaluation.score}<small>점</small></b>
              </div>
              <div className="content-feedback-grid">
                <article><h3><CheckCircle2 />내용에서 잘한 점</h3><ul>{result.contentEvaluation.goodPoints.map((point) => <li key={point}>{point}</li>)}</ul></article>
                <article><h3><Sparkles />내용 구성 제안</h3><ul>{result.contentEvaluation.improvements.map((point) => <li key={point}>{point}</li>)}</ul></article>
              </div>
            </div>
          )}
          {result.motion && (
            <div className="motion-result-panel">
              <div className="motion-result-heading"><Camera /><div><span>영상·표정 분석</span><strong>카메라 응시, 상체 자세와 표정 변화를 함께 확인했어요.</strong></div></div>
              <div className="motion-metrics">
                <article><Eye /><span>카메라 응시 추정</span><strong>{result.motion.eyeContactRate}<small>%</small></strong></article>
                <article><PersonStanding /><span>상체 정렬</span><strong>{result.motion.postureRate}<small>%</small></strong></article>
                <article><Activity /><span>자세 안정도</span><strong>{result.motion.stabilityScore}<small>%</small></strong></article>
                <article><Camera /><span>얼굴 감지</span><strong>{result.motion.facePresenceRate}<small>%</small></strong></article>
                {result.motion.expressionScore !== null && <article><Smile /><span>표정 자연스러움</span><strong>{result.motion.expressionScore}<small>점</small></strong></article>}
                {result.motion.smileRate !== null && <article><Smile /><span>미소 감지 비율</span><strong>{result.motion.smileRate}<small>%</small></strong></article>}
              </div>
              {result.motion.expressionScore !== null && <p className="expression-insight">{expressionInsight(result.motion)}</p>}
              <div className="motion-feedback-grid">
                <article><h3><CheckCircle2 />영상에서 잘한 점</h3><ul>{result.motion.goodPoints.map((point) => <li key={point}>{point}</li>)}</ul></article>
                <article><h3><Sparkles />자세 교정 제안</h3><ul>{result.motion.improvements.map((point) => <li key={point}>{point}</li>)}</ul></article>
              </div>
              <p>카메라 한 대로 계산한 추정치이며 의료·심리 진단 결과가 아닙니다.</p>
            </div>
          )}
          <div className="before-after-panel">
            <div className="comparison-heading">
              <div><span>BEFORE &amp; AFTER</span><h3>같은 연습 전후 비교</h3></div>
              {comparison && <small>{formatComparisonDate(comparison.previousCreatedAt)} 기록과 비교</small>}
            </div>
            {comparison ? (
              <>
                <p className="comparison-summary">{comparison.summary}</p>
                <div className="before-after-grid">
                  {comparison.metrics.map((metric) => (
                    <article key={metric.key} className={metric.improved === true ? "is-improved" : metric.improved === false ? "is-declined" : "is-same"}>
                      <span>{metric.label}</span>
                      <div><b>{metric.before}{metric.unit}</b><ArrowRight /><strong>{metric.after}{metric.unit}</strong></div>
                      <small>{comparisonChangeLabel(metric)}</small>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="comparison-empty"><Activity /><div><strong>비교할 이전 기록이 아직 없어요.</strong><span>다음에 같은 연습 상황을 분석하면 이번 기록과 자동으로 비교됩니다.</span></div></div>
            )}
          </div>
          <div className="result-footer"><span>분석 결과가 대시보드에 저장되었습니다.</span><Button asChild variant="outline"><a href="/dashboard">대시보드에서 확인</a></Button></div>
        </section>
      )}
    </div>
  );
}

function supportedVideoMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function preferredAudioConstraints(): MediaTrackConstraints {
  return {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
}

function expressionInsight(motion: MotionAnalysisResult): string {
  if (motion.expressionScore === null) return "표정 분석 데이터가 충분하지 않습니다.";
  if ((motion.tenseExpressionRate ?? 0) >= 35) return "눈썹과 입 주변이 강하게 고정된 구간이 있었습니다. 문장 사이에 한 번씩 가볍게 호흡해보세요.";
  if ((motion.expressionVariationScore ?? 100) < 60) return "표정 변화가 비교적 적었습니다. 핵심 단어에서 눈썹과 입꼬리를 자연스럽게 활용해보세요.";
  if (motion.expressionScore >= 80) return "얼굴에 과도한 힘이 들어가지 않았고, 말의 흐름에 맞춘 표정 변화가 안정적이었어요.";
  return "표정이 전반적으로 안정적이었습니다. 핵심 문장에서만 변화를 조금 더 주면 전달력이 좋아져요.";
}

function formatComparisonDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function comparisonChangeLabel(metric: AnalysisComparisonMetric): string {
  if (metric.delta === 0) return "변화 없음";
  if (metric.improved === true) return metric.key === "speakingRate" ? "권장 속도에 가까워졌어요" : `${Math.abs(metric.delta)}${metric.unit} 개선`;
  if (metric.improved === false) return metric.key === "speakingRate" ? "권장 속도에서 멀어졌어요" : `${Math.abs(metric.delta)}${metric.unit} 보완 필요`;
  return `${metric.delta > 0 ? "+" : ""}${metric.delta}${metric.unit} 변화`;
}
