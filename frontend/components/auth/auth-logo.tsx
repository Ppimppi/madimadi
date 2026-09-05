import Link from "next/link";

export function AuthLogo() {
  return (
    <Link className="auth-brand" href="/" aria-label="마디마디 홈">
      <span className="auth-brand-mark" aria-hidden="true">
        {[12, 20, 30, 22, 15].map((height, index) => (
          <span key={index} style={{ height }} />
        ))}
      </span>
      <span>마디마디</span>
    </Link>
  );
}
