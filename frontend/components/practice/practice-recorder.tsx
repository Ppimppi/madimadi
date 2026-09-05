"use client";

import {
  CheckCircle2,
  CircleStop,
  Gauge,
  MessageCircleWarning,
  Mic2,
  RotateCcw,
  Save,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRACTICE_TYPES, type PracticeType, type SpeechAnalysisResult } from "@/lib/speech-analysis";

type RecorderStatus = "idle" | "recording" | "recorded" | "analyzing" | "complete";

type SavedAnalysis = SpeechAnalysisResult & {
  id: string;
  practiceType: PracticeType;
  transcript: string;
  durationSeconds: number;
  createdAt: number;
};

type RecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
};

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
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

export function PracticeRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [practiceType, setPracticeType] = useState<PracticeType>("자유 말하기");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<SavedAnalysis | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const finalTranscriptRef = useRef("");
  const shouldRecognizeRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setSeconds(duration);
    setStatus("recorded");
    shouldRecognizeRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recognitionRef.current?.stop();
    recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  async function startRecording() {
    setError("");
    setNotice("");
    setResult(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    chunksRef.current = [];
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("이 브라우저에서는 마이크 녹음을 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해주세요.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
      };
      recorder.start(250);

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
        recognition.onerror = () => {
          setNotice("자동 받아쓰기가 잠시 멈췄습니다. 녹음 후 아래 내용을 직접 수정할 수 있어요.");
        };
        recognition.onend = () => {
          if (shouldRecognizeRef.current) {
            try {
              recognition.start();
            } catch {
              // The browser may already be restarting the recognition session.
            }
          }
        };
        recognitionRef.current = recognition;
        shouldRecognizeRef.current = true;
        recognition.start();
      } else {
        setNotice("이 브라우저는 자동 받아쓰기를 지원하지 않습니다. 녹음 후 내용을 직접 입력해주세요.");
      }

      startedAtRef.current = Date.now();
      setSeconds(0);
      setStatus("recording");
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 300) stopRecording();
      }, 250);
    } catch {
      setError("마이크 권한을 허용해야 연습을 시작할 수 있습니다.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  }

  function resetPractice() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript("");
    setSeconds(0);
    setResult(null);
    setError("");
    setNotice("");
    setStatus("idle");
    finalTranscriptRef.current = "";
  }

  async function saveAndAnalyze() {
    if (seconds < 3) {
      setError("3초 이상 말한 뒤 분석해주세요.");
      return;
    }
    if (transcript.trim().length < 2) {
      setError("자동 받아쓰기 내용을 확인하거나 직접 입력해주세요.");
      return;
    }

    setStatus("analyzing");
    setError("");
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, durationSeconds: seconds, practiceType }),
      });
      const data = (await response.json()) as { analysis?: SavedAnalysis; error?: string };
      if (!response.ok || !data.analysis) throw new Error(data.error || "분석에 실패했습니다.");
      setResult(data.analysis);
      setStatus("complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "분석 중 문제가 발생했습니다.");
      setStatus("recorded");
    }
  }

  return (
    <div className="practice-workspace">
      <section className="practice-recorder-card">
        <div className="practice-options">
          <div>
            <label htmlFor="practice-type">연습 상황</label>
            <Select value={practiceType} onValueChange={(value) => setPracticeType(value as PracticeType)} disabled={status === "recording" || status === "analyzing"}>
              <SelectTrigger id="practice-type" className="practice-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRACTICE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <span className={`recording-state ${status === "recording" ? "is-live" : ""}`}>
            <i /> {status === "recording" ? "녹음 중" : status === "complete" ? "분석 완료" : "준비됨"}
          </span>
        </div>

        <div className={`recorder-orb ${status === "recording" ? "is-recording" : ""}`}>
          <Mic2 aria-hidden="true" />
        </div>
        <strong className="recording-time" aria-live="polite">{formatTime(seconds)}</strong>
        <p className="recording-guide">
          {status === "recording"
            ? "평소 말하듯 자연스럽게 이야기하세요. 최대 5분까지 녹음됩니다."
            : status === "idle"
              ? "버튼을 누르고 30초 이상 말하면 더 정확하게 분석할 수 있어요."
              : "녹음을 들어보고 받아쓰기 내용을 확인한 뒤 분석을 시작하세요."}
        </p>

        <div className="recorder-actions">
          {status === "idle" && <Button className="record-primary" onClick={startRecording}><Mic2 />녹음 시작</Button>}
          {status === "recording" && <Button className="record-stop" onClick={stopRecording}><CircleStop />녹음 종료</Button>}
          {(status === "recorded" || status === "complete") && <Button variant="outline" onClick={resetPractice}><RotateCcw />다시 녹음</Button>}
          {status === "recorded" && <Button className="record-primary" onClick={saveAndAnalyze}><Sparkles />분석하고 저장</Button>}
          {status === "analyzing" && <Button className="record-primary" disabled><Save />분석 중…</Button>}
        </div>

        {audioUrl && <audio className="practice-audio" controls src={audioUrl}>녹음된 오디오를 재생할 수 없습니다.</audio>}
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
          placeholder="녹음을 시작하면 말한 내용이 여기에 표시됩니다. 자동 받아쓰기가 정확하지 않으면 직접 수정할 수 있어요."
          aria-label="녹음 받아쓰기 내용"
        />
      </section>

      {result && (
        <section className="analysis-result" aria-live="polite">
          <div className="result-score">
            <span>종합 점수</span>
            <strong>{result.score}<small>점</small></strong>
            <p>{result.summary}</p>
          </div>
          <div className="result-metrics">
            <article><Gauge /><span>말하기 속도</span><strong>{result.speakingRate}<small> 어절/분</small></strong></article>
            <article><MessageCircleWarning /><span>추임새</span><strong>{result.fillerCount}<small> 회</small></strong></article>
            <article><Volume2 /><span>말한 분량</span><strong>{result.wordCount}<small> 어절</small></strong></article>
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
          <div className="result-footer"><span>분석 결과가 대시보드에 저장되었습니다.</span><Button asChild variant="outline"><a href="/dashboard">대시보드에서 확인</a></Button></div>
        </section>
      )}
    </div>
  );
}
