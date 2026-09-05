import type { Metadata } from "next";
import Link from "next/link";

import { AuthLogo } from "@/components/auth/auth-logo";
import { SignupForm } from "@/components/auth/signup-form";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

export const metadata: Metadata = {
  title: "회원가입 | 마디마디",
};

export default function SignupPage() {
  return (
    <main className="auth-page signup-page">
      <section className="auth-card signup-card" aria-labelledby="signup-title">
        <AuthLogo />
        <div className="auth-heading compact">
          <h1 id="signup-title">회원가입</h1>
          <p>당신에게 맞는 말하기 연습을 시작해보세요.</p>
        </div>
        <SignupForm />
        <SocialLoginButtons />
        <p className="auth-switch">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </section>
      <Link className="auth-home-link" href="/">← 홈으로 돌아가기</Link>
    </main>
  );
}
