"use client";

import { BriefcaseBusiness, MessageCircle, Mic2, Presentation, RefreshCw, UsersRound } from "lucide-react";
import { useState } from "react";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { PracticeRecorder } from "@/components/practice/practice-recorder";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { PracticeType } from "@/lib/speech-analysis";

const practiceModes: Record<PracticeType, {
  icon: typeof Mic2;
  label: string;
  questions: string[];
  tips: string[];
}> = {
  "자유 말하기": {
    icon: Mic2,
    label: "자유 연습",
    questions: ["원하는 주제로 30초 이상 자유롭게 말해보세요."],
    tips: ["평소 말투 그대로 이야기하면 습관을 더 정확히 확인할 수 있어요.", "카메라를 켜면 시선·자세·표정도 함께 분석합니다."],
  },
  면접: {
    icon: BriefcaseBusiness,
    label: "면접",
    questions: ["1분 안에 자신을 소개해주세요.", "본인의 강점과 보완하고 싶은 점을 말해주세요.", "협업 중 갈등을 해결했던 경험을 설명해주세요."],
    tips: ["결론을 먼저 말한 뒤 근거를 덧붙이세요.", "경험은 상황–행동–결과 순서로 정리해보세요."],
  },
  발표: {
    icon: Presentation,
    label: "발표",
    questions: ["마디마디 서비스를 처음 듣는 사람에게 소개해주세요.", "최근 배운 내용 중 가장 인상 깊었던 개념을 설명해주세요.", "학교생활을 더 편리하게 만들 아이디어를 발표해주세요."],
    tips: ["첫 문장에 발표의 핵심을 넣어보세요.", "한 문장에 하나의 정보만 담으면 더 잘 들립니다."],
  },
  회의: {
    icon: UsersRound,
    label: "회의",
    questions: ["프로젝트 일정이 늦어졌을 때 해결 방안을 제안해주세요.", "팀에서 먼저 처리해야 할 업무의 우선순위를 설명해주세요.", "현재 프로젝트에서 예상되는 위험과 대응책을 말해주세요."],
    tips: ["문제와 제안을 분리해서 말해보세요.", "담당자와 다음 행동을 구체적으로 제시해보세요."],
  },
  대화: {
    icon: MessageCircle,
    label: "대화",
    questions: ["최근 가장 즐거웠던 일을 친구에게 이야기해주세요.", "좋아하는 취미를 처음 듣는 사람에게 설명해주세요.", "고민하는 친구에게 공감과 조언을 건네보세요."],
    tips: ["상대가 떠올릴 수 있도록 구체적인 장면을 넣어보세요.", "짧은 질문을 섞으면 자연스러운 대화가 됩니다."],
  },
};

export default function PracticePage() {
  const { user, loading, error } = useCurrentUser();
  const [mode, setMode] = useState<PracticeType>("자유 말하기");
  const [questionIndex, setQuestionIndex] = useState(0);

  if (error) return <WorkspaceError message={error} />;
  if (loading || !user) return <WorkspaceLoading label="말하기 연습을 불러오는 중입니다…" />;

  const practice = practiceModes[mode];
  const prompt = practice.questions[questionIndex];
  const ModeIcon = practice.icon;

  function changeMode(value: string) {
    setMode(value as PracticeType);
    setQuestionIndex(0);
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
        key={`${mode}-${questionIndex}`}
        initialPracticeType={mode}
        lockedType
        variant="scenario"
        scenarioPrompt={mode === "자유 말하기" ? undefined : prompt}
        intro={(
          <div className="mm-scenario-inline">
            <div className="mm-scenario-icon"><ModeIcon /></div>
            <div>
              <span>{mode === "자유 말하기" ? "연습 안내" : "오늘의 질문"}</span>
              <h2>{prompt}</h2>
              <ul>{practice.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </div>
            {practice.questions.length > 1 && (
              <Button variant="outline" onClick={() => setQuestionIndex((current) => (current + 1) % practice.questions.length)}>
                <RefreshCw />다른 질문
              </Button>
            )}
          </div>
        )}
      />
    </WorkspaceLayout>
  );
}
