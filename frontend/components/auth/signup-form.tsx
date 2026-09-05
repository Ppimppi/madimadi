"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLOWED_GOALS } from "@/lib/auth-constants";

export function SignupForm() {
  const [goals, setGoals] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleGoal(goal: string, checked: boolean) {
    setGoals((current) =>
      checked ? Array.from(new Set([...current, goal])) : current.filter((item) => item !== goal),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const passwordConfirm = String(data.get("passwordConfirm") ?? "");

    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password,
          passwordConfirm,
          goals,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "회원가입에 실패했습니다.");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form signup-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <Label htmlFor="signup-name">이름</Label>
        <Input
          id="signup-name"
          name="name"
          placeholder="이름을 입력해주세요"
          autoComplete="name"
          minLength={2}
          maxLength={40}
          required
        />
      </div>

      <div className="auth-field">
        <Label htmlFor="signup-email">이메일</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="이메일을 입력해주세요"
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-field">
        <Label htmlFor="signup-password">비밀번호</Label>
        <div className="password-field">
          <Input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="8자 이상 입력해주세요"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="password-toggle"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>

      <div className="auth-field">
        <Label htmlFor="signup-password-confirm">비밀번호 확인</Label>
        <Input
          id="signup-password-confirm"
          name="passwordConfirm"
          type={showPassword ? "text" : "password"}
          placeholder="비밀번호를 다시 입력해주세요"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </div>

      <fieldset className="goal-fieldset">
        <legend>목표 선택 <span>(복수 선택 가능)</span></legend>
        <div className="goal-grid">
          {ALLOWED_GOALS.map((goal, index) => {
            const id = `goal-${index}`;
            return (
              <div className="goal-option" key={goal}>
                <Checkbox
                  id={id}
                  checked={goals.includes(goal)}
                  onCheckedChange={(checked) => toggleGoal(goal, checked === true)}
                />
                <Label htmlFor={id}>{goal}</Label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <p className="auth-error" aria-live="polite">{error}</p>

      <Button className="auth-submit" type="submit" disabled={submitting}>
        {submitting ? <><LoaderCircle className="spin" /> 가입 중</> : "회원가입"}
      </Button>
    </form>
  );
}
