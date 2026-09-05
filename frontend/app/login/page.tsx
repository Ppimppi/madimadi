import type { Metadata } from "next";
import Link from "next/link";

import { AuthLogo } from "@/components/auth/auth-logo";
import { LoginForm } from "@/components/auth/login-form";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

export const metadata: Metadata = {
  title: "로그인 | 마디마디",
};

const oauthErrors: Record<string, string> = {
  google_not_configured: "Google 로그인을 사용하려면 앱 키 등록이 필요합니다.",
  kakao_not_configured: "카카오 로그인을 사용하려면 앱 키 등록이 필요합니다.",
  oauth_denied: "소셜 로그인이 취소되었습니다.",
  oauth_state: "로그인 요청을 확인할 수 없습니다. 다시 시도해주세요.",
  oauth_exchange: "소셜 로그인 중 문제가 발생했습니다. 다시 시도해주세요.",
  oauth_email: "이메일 제공 동의가 필요합니다.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const { oauth } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <AuthLogo />
        <div className="auth-heading">
          <h1 id="login-title">말버릇을 줄이고,<br />더 자신감 있게 말해보세요.</h1>
          <p>마디마디에 다시 오신 걸 환영해요.</p>
        </div>
        {oauth && oauthErrors[oauth] ? (
          <p className="oauth-page-error" role="alert">{oauthErrors[oauth]}</p>
        ) : null}
        <LoginForm />
        <SocialLoginButtons />
        <p className="auth-switch">
          계정이 없으신가요? <Link href="/signup">회원가입</Link>
        </p>
      </section>
      <Link className="auth-home-link" href="/">← 홈으로 돌아가기</Link>
    </main>
  );
}
