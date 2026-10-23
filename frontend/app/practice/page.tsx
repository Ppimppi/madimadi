"use client";

import { BriefcaseBusiness, MessageCircle, Mic2, Presentation, RefreshCw, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { PracticeRecorder, type RecorderStatus } from "@/components/practice/practice-recorder";
import { RecentFeedback } from "@/components/practice/recent-feedback";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { PracticeType } from "@/lib/speech-analysis";

type ScenarioMode = Exclude<PracticeType, "자유 말하기">;

type ActiveQuestion = {
  question: string;
  tips: string[];
  category: string;
};

type QuestionResponse = ActiveQuestion & {
  source?: "ai" | "fallback";
  error?: string;
};

const practiceModes: Record<PracticeType, {
  icon: typeof Mic2;
  label: string;
  defaultQuestion: string;
  defaultTips: string[];
}> = {
  "자유 말하기": {
    icon: Mic2,
    label: "자유 연습",
    defaultQuestion: "원하는 주제로 30초 이상 자유롭게 말해보세요.",
    defaultTips: ["평소 말투 그대로 이야기하면 습관을 더 정확히 확인할 수 있어요.", "카메라를 켜면 시선·자세·표정도 함께 분석합니다."],
  },
  면접: {
    icon: BriefcaseBusiness,
    label: "면접",
    defaultQuestion: "지원한 직무에서 본인만의 강점을 어떻게 활용할 수 있는지 구체적으로 말씀해주세요.",
    defaultTips: ["강점을 한 문장으로 먼저 제시하세요.", "경험과 지원 직무를 직접 연결해보세요."],
  },
  발표: {
    icon: Presentation,
    label: "발표",
    defaultQuestion: "생성형 AI의 장점과 한계를 처음 듣는 청중에게 쉽게 설명해주세요.",
    defaultTips: ["발표의 핵심을 첫 문장에 넣어보세요.", "익숙한 사례나 비유를 한 가지 활용하세요."],
  },
  회의: {
    icon: UsersRound,
    label: "회의",
    defaultQuestion: "팀 프로젝트 일정이 일주일 늦어진 회의에서 마감일을 지키기 위한 조정안을 제안해주세요.",
    defaultTips: ["지연 원인과 영향을 먼저 정리하세요.", "우선순위, 담당자, 새 기한을 구체화하세요."],
  },
  대화: {
    icon: MessageCircle,
    label: "대화",
    defaultQuestion: "중요한 시험에서 기대한 결과를 얻지 못한 친구에게 공감과 위로의 말을 건네보세요.",
    defaultTips: ["해결책보다 상대의 감정을 먼저 인정하세요.", "상대가 원하는 도움을 짧게 물어보세요."],
  },
};

const initialQuestion: ActiveQuestion = {
  question: practiceModes["자유 말하기"].defaultQuestion,
  tips: practiceModes["자유 말하기"].defaultTips,
  category: "",
};

export default function PracticePage() {
  const { user, loading, error } = useCurrentUser();
  const [mode, setMode] = useState<PracticeType>("자유 말하기");
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion>(initialQuestion);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [questionVersion, setQuestionVersion] = useState(0);
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus>("idle");
  const [historyVersion, setHistoryVersion] = useState(0);
  const recentQuestionsRef = useRef<Partial<Record<ScenarioMode, string[]>>>({});
  const recentCategoriesRef = useRef<Partial<Record<ScenarioMode, string[]>>>({});
  const requestNumberRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    requestNumberRef.current += 1;
    requestControllerRef.current?.abort();
  }, []);

  if (error) return <WorkspaceError message={error} />;
  if (loading || !user) return <WorkspaceLoading label="말하기 연습을 불러오는 중입니다…" />;

  const practice = practiceModes[mode];
  const ModeIcon = practice.icon;
  const questionLocked = recorderStatus === "recording"
    || recorderStatus === "recorded"
    || recorderStatus === "analyzing";

  function changeMode(value: string) {
    const nextMode = value as PracticeType;
    requestControllerRef.current?.abort();
    requestNumberRef.current += 1;
    setMode(nextMode);
    setQuestionError("");
    setRecorderStatus("idle");
    setQuestionVersion((current) => current + 1);

    if (nextMode === "자유 말하기") {
      setQuestionLoading(false);
      setActiveQuestion({
        question: practiceModes[nextMode].defaultQuestion,
        tips: practiceModes[nextMode].defaultTips,
        category: "",
      });
      return;
    }

    void loadQuestion(nextMode);
  }

  async function loadQuestion(targetMode: ScenarioMode) {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestNumber = ++requestNumberRef.current;
    const fallback = practiceModes[targetMode];

    setQuestionLoading(true);
    setQuestionError("");
    setRecorderStatus("idle");
    setQuestionVersion((current) => current + 1);
    setActiveQuestion({
      question: `${targetMode} 모드에 맞는 새 질문을 만들고 있어요…`,
      tips: ["AI가 질문의 상황과 답변 목표를 구성하고 있습니다.", "잠시만 기다려주세요."],
      category: "질문 생성 중",
    });

    try {
      const response = await fetch("/api/practice/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: targetMode,
          previousQuestions: recentQuestionsRef.current[targetMode] ?? [],
          previousCategories: recentCategoriesRef.current[targetMode] ?? [],
        }),
        signal: controller.signal,
      });
      const data = (await response.json()) as QuestionResponse;
      if (!response.ok) throw new Error(data.error || "새 질문을 만들지 못했습니다.");
      if (!isValidQuestionResponse(data)) throw new Error("질문 응답 형식이 올바르지 않습니다.");
      if (requestNumber !== requestNumberRef.current) return;

      setActiveQuestion({ question: data.question, tips: data.tips, category: data.category });
      if (data.source === "fallback") {
        setQuestionError("AI 질문 서버가 혼잡해 이 모드에 맞는 준비된 질문을 표시합니다.");
      }
      recentQuestionsRef.current[targetMode] = [
        ...(recentQuestionsRef.current[targetMode] ?? []),
        data.question,
      ].slice(-8);
      recentCategoriesRef.current[targetMode] = [
        ...(recentCategoriesRef.current[targetMode] ?? []),
        data.category,
      ].slice(-4);
    } catch (caught) {
      if (controller.signal.aborted || requestNumber !== requestNumberRef.current) return;
      setActiveQuestion({
        question: fallback.defaultQuestion,
        tips: fallback.defaultTips,
        category: "준비된 질문",
      });
      setQuestionError(caught instanceof Error
        ? `${caught.message} 대신 이 모드에 맞는 준비된 질문을 표시합니다.`
        : "AI 질문을 불러오지 못해 이 모드에 맞는 준비된 질문을 표시합니다.");
    } finally {
      if (requestNumber === requestNumberRef.current) setQuestionLoading(false);
    }
  }

  return (
    <WorkspaceLayout active="analysis" user={user} eyebrow="AI SPEAKING PRACTICE" title="말하기 연습·분석" description="상황을 고르고 말하면 추임새, 내용 적합성, 시선·자세·표정을 한 번에 분석합니다.">
      <Tabs value={mode} onValueChange={changeMode} className="mm-scenario-tabs">
        <TabsList className="mm-mode-tabs">
          {(Object.keys(practiceModes) as PracticeType[]).map((key) => {
            const Icon = practiceModes[key].icon;
            return <TabsTrigger key={key} value={key}><Icon />{practiceModes[key].label}</TabsTrigger>;
          })}
        </TabsList>
      </Tabs>

      <PracticeRecorder
        key={`${mode}-${questionVersion}`}
        initialPracticeType={mode}
        lockedType
        disabled={questionLoading}
        onStatusChange={setRecorderStatus}
        onAnalysisSaved={() => setHistoryVersion((current) => current + 1)}
        variant="scenario"
        scenarioPrompt={mode === "자유 말하기" ? undefined : activeQuestion.question}
        intro={(
          <div className="mm-scenario-inline">
            <div className="mm-scenario-icon"><ModeIcon /></div>
            <div>
              <span>
                {mode === "자유 말하기"
                  ? "연습 안내"
                  : `오늘의 질문${activeQuestion.category ? ` · ${activeQuestion.category}` : ""}`}
              </span>
              <h2>{activeQuestion.question}</h2>
              <ul>{activeQuestion.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
              {questionError && <p className="mm-question-error" role="status">{questionError}</p>}
            </div>
            {mode !== "자유 말하기" && (
              <Button
                variant="outline"
                disabled={questionLoading || questionLocked}
                title={questionLocked ? "녹음 또는 분석을 마친 뒤 질문을 바꿀 수 있습니다." : undefined}
                onClick={() => loadQuestion(mode)}
              >
                <RefreshCw className={questionLoading ? "mm-spin" : undefined} />
                {questionLoading ? "생성 중…" : "다른 질문"}
              </Button>
            )}
          </div>
        )}
      />
      <RecentFeedback refreshKey={historyVersion} />
    </WorkspaceLayout>
  );
}

function isValidQuestionResponse(value: QuestionResponse): boolean {
  return typeof value.question === "string"
    && value.question.trim().length >= 15
    && typeof value.category === "string"
    && value.category.trim().length > 0
    && Array.isArray(value.tips)
    && value.tips.length === 2
    && value.tips.every((tip) => typeof tip === "string" && tip.trim().length > 0);
}
