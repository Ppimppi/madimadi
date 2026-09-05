"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "로그인에 실패했습니다.");
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
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <Label htmlFor="login-email">이메일 주소</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="이메일을 입력해주세요"
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-field">
        <Label htmlFor="login-password">비밀번호</Label>
        <div className="password-field">
          <Input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호를 입력해주세요"
            autoComplete="current-password"
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

      <p className="auth-error" aria-live="polite">{error}</p>

      <Button className="auth-submit" type="submit" disabled={submitting}>
        {submitting ? <><LoaderCircle className="spin" /> 로그인 중</> : "로그인"}
      </Button>
    </form>
  );
}
