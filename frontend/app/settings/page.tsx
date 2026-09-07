"use client";

import { Bell, CircleUserRound, Info, Languages, LockKeyhole, ShieldCheck, Trash2, UserRoundCog } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { readApiError, type CurrentUser } from "@/lib/workspace";

const GOALS = ["면접 준비", "발표 연습", "일상 대화 개선", "스토리텔링 향상"];

export default function SettingsPage() {
  const { user, setUser, loading, error } = useCurrentUser();
  const [name, setName] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[] | null>(null);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [deleteText, setDeleteText] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotifications(window.localStorage.getItem("madimadi-notifications") !== "false");
      setWeeklyReport(window.localStorage.getItem("madimadi-weekly-report") !== "false");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (error) return <WorkspaceError message={error} />;
  if (loading || !user) return <WorkspaceLoading label="설정을 불러오는 중입니다…" />;
  const currentName = name ?? user.name;
  const currentGoals = goals ?? user.goals;

  async function updateProfile(event?: FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setNotice("");
    setFormError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: currentName, goals: currentGoals }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "설정을 저장하지 못했습니다."));
      const body = await response.json() as { user: CurrentUser };
      setUser(body.user);
      setName(body.user.name);
      setGoals(body.user.goals);
      setNotice("변경사항을 저장했습니다.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setNotice("");
    setFormError("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword"), passwordConfirm: data.get("passwordConfirm") }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "비밀번호를 변경하지 못했습니다."));
      event.currentTarget.reset();
      setNotice("비밀번호를 변경했습니다.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    const response = await fetch("/api/auth/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteText }),
    });
    if (!response.ok) {
      setFormError(await readApiError(response, "회원 탈퇴를 처리하지 못했습니다."));
      return;
    }
    window.location.replace("/");
  }

  function saveNotifications(key: "notifications" | "weekly", checked: boolean) {
    if (key === "notifications") {
      setNotifications(checked);
      window.localStorage.setItem("madimadi-notifications", String(checked));
    } else {
      setWeeklyReport(checked);
      window.localStorage.setItem("madimadi-weekly-report", String(checked));
    }
    setNotice("알림 설정을 이 기기에 저장했습니다.");
  }

  return (
    <WorkspaceLayout active="settings" user={user} eyebrow="ACCOUNT SETTINGS" title="설정" description="프로필과 연습 목표, 계정 보안을 관리하세요.">
      {(notice || formError) && <p className={formError ? "mm-form-error mm-global-notice" : "mm-form-success mm-global-notice"}>{formError || notice}</p>}
      <Tabs defaultValue="profile" orientation="vertical" className="mm-settings-layout">
        <TabsList className="mm-settings-nav">
          <TabsTrigger value="profile"><CircleUserRound />프로필</TabsTrigger>
          <TabsTrigger value="account"><UserRoundCog />계정</TabsTrigger>
          <TabsTrigger value="notifications"><Bell />알림 설정</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck />보안</TabsTrigger>
          <TabsTrigger value="language"><Languages />언어</TabsTrigger>
          <TabsTrigger value="info"><Info />정보</TabsTrigger>
        </TabsList>

        <div className="mm-card mm-settings-panel">
          <TabsContent value="profile">
            <SettingsHeading icon={CircleUserRound} title="프로필 정보" copy="대시보드에 표시할 정보를 수정합니다." />
            <form className="mm-settings-form" onSubmit={updateProfile}>
              <label>이름<Input value={currentName} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required /></label>
              <label>이메일<Input value={user.email} readOnly /><small>로그인에 사용하는 이메일은 현재 변경할 수 없습니다.</small></label>
              <Button type="submit" disabled={saving}>{saving ? "저장 중…" : "프로필 저장"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="account">
            <SettingsHeading icon={UserRoundCog} title="연습 목표와 계정" copy="맞춤 추천에 사용할 목표를 선택합니다." />
            <div className="mm-goal-settings">{GOALS.map((goal) => <label key={goal}><Checkbox checked={currentGoals.includes(goal)} onCheckedChange={(checked) => setGoals((current) => { const base = current ?? user.goals; return checked ? [...new Set([...base, goal])] : base.filter((item) => item !== goal); })} />{goal}</label>)}</div>
            <Button onClick={() => void updateProfile()} disabled={saving}>목표 저장</Button>
            <div className="mm-danger-zone"><div><strong>회원 탈퇴</strong><p>회원 정보와 모든 분석 기록이 영구적으로 삭제됩니다.</p></div>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline"><Trash2 />회원 탈퇴</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>정말 마디마디를 탈퇴하시겠습니까?</AlertDialogTitle><AlertDialogDescription>삭제된 회원 정보와 분석 기록은 복구할 수 없습니다. 계속하려면 아래에 ‘마디마디 탈퇴’를 입력하세요.</AlertDialogDescription></AlertDialogHeader>
                  <Input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="마디마디 탈퇴" />
                  <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleteText !== "마디마디 탈퇴"} onClick={() => void deleteAccount()}>영구 삭제</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <SettingsHeading icon={Bell} title="알림 설정" copy="현재 브라우저에서 받을 연습 알림을 관리합니다." />
            <div className="mm-setting-rows"><label><div><strong>연습 알림</strong><small>꾸준한 연습을 위한 안내를 표시합니다.</small></div><Switch checked={notifications} onCheckedChange={(checked) => saveNotifications("notifications", checked)} /></label><label><div><strong>주간 리포트 알림</strong><small>새로운 주간 리포트가 준비되면 알려줍니다.</small></div><Switch checked={weeklyReport} onCheckedChange={(checked) => saveNotifications("weekly", checked)} /></label></div>
          </TabsContent>

          <TabsContent value="security">
            <SettingsHeading icon={LockKeyhole} title="비밀번호 변경" copy="일반 이메일 계정의 비밀번호를 변경합니다." />
            <form className="mm-settings-form" onSubmit={changePassword}>
              <label>현재 비밀번호<Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
              <label>새 비밀번호<Input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /><small>8자 이상 입력해주세요.</small></label>
              <label>새 비밀번호 확인<Input name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} required /></label>
              <Button type="submit" disabled={saving}>{saving ? "변경 중…" : "비밀번호 변경"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="language">
            <SettingsHeading icon={Languages} title="언어" copy="마디마디에서 사용할 표시 언어입니다." />
            <label className="mm-language-card"><input type="radio" checked readOnly /><span><strong>한국어</strong><small>현재 지원되는 언어</small></span></label>
            <p className="mm-muted-note">다른 언어의 음성 분석과 화면 번역은 추후 지원할 예정입니다.</p>
          </TabsContent>

          <TabsContent value="info">
            <SettingsHeading icon={Info} title="서비스 정보" copy="현재 사용 중인 마디마디 버전입니다." />
            <dl className="mm-info-list"><div><dt>서비스</dt><dd>마디마디 AI 말하기 코칭</dd></div><div><dt>버전</dt><dd>2.0 Gemini</dd></div><div><dt>음성 분석</dt><dd>Google Gemini</dd></div><div><dt>분석 기록</dt><dd>회원 계정에 안전하게 저장</dd></div></dl>
          </TabsContent>
        </div>
      </Tabs>
    </WorkspaceLayout>
  );
}

function SettingsHeading({ icon: Icon, title, copy }: { icon: typeof CircleUserRound; title: string; copy: string }) {
  return <div className="mm-settings-heading"><span><Icon /></span><div><h2>{title}</h2><p>{copy}</p></div></div>;
}
