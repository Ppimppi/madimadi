"use client";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { PracticeRecorder } from "@/components/practice/practice-recorder";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function PracticePage() {
  const { user, loading, error } = useCurrentUser();
  if (error) return <WorkspaceError message={error} />;
  if (loading || !user) return <WorkspaceLoading label="음성 분석 화면을 불러오는 중입니다…" />;

  return (
    <WorkspaceLayout active="analysis" user={user} eyebrow="VOICE ANALYSIS" title="음성 분석" description="말을 녹음하면 Gemini가 원본 음성을 받아쓰고 속도와 말버릇을 분석합니다.">
      <PracticeRecorder />
    </WorkspaceLayout>
  );
}
