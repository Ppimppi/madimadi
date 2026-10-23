"use client";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { PracticeRecorder } from "@/components/practice/practice-recorder";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function PracticePage() {
  const { user, loading, error } = useCurrentUser();
  if (error) return <WorkspaceError message={error} />;
  if (loading || !user) return <WorkspaceLoading label="음성·영상 분석 화면을 불러오는 중입니다…" />;

  return (
    <WorkspaceLayout active="analysis" user={user} eyebrow="SPEECH & MOTION ANALYSIS" title="음성·영상 분석" description="Gemini가 말하기 습관을, MediaPipe가 카메라 응시와 상체 자세를 함께 분석합니다.">
      <PracticeRecorder lockedType />
    </WorkspaceLayout>
  );
}
