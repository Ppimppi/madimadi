import { Button } from "@/components/ui/button";

export function SocialLoginButtons() {
  return (
    <div className="social-login">
      <div className="auth-divider"><span>또는</span></div>
      <Button asChild variant="outline" className="social-button google-button">
        <a href="/api/auth/oauth/google">
          <span className="google-mark" aria-hidden="true">G</span>
          Google로 계속하기
        </a>
      </Button>
      <Button asChild variant="outline" className="social-button kakao-button">
        <a href="/api/auth/oauth/kakao">
          <span className="kakao-mark" aria-hidden="true">K</span>
          카카오로 계속하기
        </a>
      </Button>
    </div>
  );
}
