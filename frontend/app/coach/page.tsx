"use client";

import { Bot, Gauge, Mic2, Send, Sparkles, Wind } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { WorkspaceError, WorkspaceLayout, WorkspaceLoading } from "@/components/dashboard/workspace-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { readApiError, type DashboardSummary } from "@/lib/workspace";

type CoachMessage = { id: string; role: "user" | "assistant"; content: string };

const welcomeMessage: CoachMessage = {
  id: "welcome",
  role: "assistant",
  content: "안녕하세요! 최근 말하기 기록을 바탕으로 함께 연습해볼게요. 어려운 상황이나 고치고 싶은 습관을 편하게 말씀해주세요.",
};

export default function CoachPage() {
  const { user, loading, error } = useCurrentUser();
  const [messages, setMessages] = useState<CoachMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/analyses/summary", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ summary: DashboardSummary }> : null)
      .then((body) => { if (body) setSummary(body.summary); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    window.localStorage.setItem(`madimadi-coach-${user.id}`, JSON.stringify(messages.slice(-20)));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, user]);

  const training = useMemo(() => {
    const latest = summary?.recent[0];
    return [
      { icon: Wind, title: "호흡 훈련", copy: "복식 호흡으로 긴장 완화" },
      latest && latest.speakingRate > 160
        ? { icon: Gauge, title: "속도 조절 훈련", copy: "문장 끝에서 한 박자 쉬기" }
        : { icon: Gauge, title: "속도 조절 훈련", copy: "안정적인 말하기 리듬 만들기" },
      latest && latest.fillerCount > 0
        ? { icon: Mic2, title: "말버릇 대체 훈련", copy: `최근 추임새 ${latest.fillerCount}회 줄이기` }
        : { icon: Mic2, title: "자신감 훈련", copy: "첫 문장을 또렷하게 시작하기" },
    ];
  }, [summary]);

  if (error) return <WorkspaceError message={error} />;
  if (loading || !user) return <WorkspaceLoading label="AI 코치를 불러오는 중입니다…" />;

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    const userMessage: CoachMessage = { id: crypto.randomUUID(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setSendError("");
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })) }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "AI 코치에게 연결하지 못했습니다."));
      const body = await response.json() as { reply: string };
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: body.reply }]);
    } catch (caught) {
      setSendError(caught instanceof Error ? caught.message : "AI 코치에게 연결하지 못했습니다.");
    } finally {
      setSending(false);
    }
  }

  function askQuickly(question: string) {
    setInput(question);
  }

  return (
    <WorkspaceLayout active="coach" user={user} eyebrow="AI SPEECH COACH" title="AI 코치" description="최근 분석 기록을 이해하는 Gemini 코치에게 구체적인 연습 방법을 물어보세요.">
      <section className="mm-coach-layout">
        <article className="mm-card mm-chat-card">
          <div className="mm-chat-head"><span className="mm-bot-avatar"><Bot /></span><div><strong>마디 코치</strong><small><i />최근 분석 기록 연결됨</small></div></div>
          <div className="mm-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`mm-message ${message.role}`}>
                {message.role === "assistant" && <span><Bot /></span>}
                <p>{message.content}</p>
              </div>
            ))}
            {sending && <div className="mm-message assistant"><span><Bot /></span><p className="mm-typing"><i /><i /><i /></p></div>}
            <div ref={endRef} />
          </div>
          <div className="mm-quick-questions">
            {["추임새를 줄이는 연습을 알려주세요.", "제 말하기 속도는 어떤가요?", "면접 첫 문장을 같이 만들어주세요."].map((question) => <button type="button" key={question} onClick={() => askQuickly(question)}>{question}</button>)}
          </div>
          <form className="mm-chat-form" onSubmit={sendMessage}>
            <Textarea value={input} onChange={(event) => setInput(event.target.value.slice(0, 500))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="메시지를 입력하세요…" aria-label="AI 코치에게 보낼 메시지" />
            <Button type="submit" disabled={!input.trim() || sending} aria-label="메시지 보내기"><Send /></Button>
          </form>
          {sendError && <p className="mm-form-error" role="alert">{sendError}</p>}
        </article>

        <aside className="mm-card mm-training-card">
          <span><Sparkles /> 개인 맞춤 훈련</span>
          <h2>지금 필요한 연습</h2>
          <div>{training.map((item) => { const Icon = item.icon; return <article key={item.title}><Icon /><div><strong>{item.title}</strong><small>{item.copy}</small></div></article>; })}</div>
          <Button asChild><a href="/situational-practice">훈련 시작하기</a></Button>
        </aside>
      </section>
    </WorkspaceLayout>
  );
}
