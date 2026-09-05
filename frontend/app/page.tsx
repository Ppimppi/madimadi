import {
  ArrowRight,
  AudioLines,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  Mic2,
  Play,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const waveform = [
  18, 28, 44, 32, 56, 70, 38, 52, 82, 62, 46, 74, 92, 54, 38, 66, 48, 76,
  58, 34, 50, 78, 60, 42, 68, 30, 54, 40,
];

const features = [
  {
    icon: AudioLines,
    title: "실시간 말버릇 분석",
    description: "말하는 순간 반복되는 추임새와 불필요한 표현을 찾아드려요.",
  },
  {
    icon: Bot,
    title: "AI 맞춤 피드백",
    description: "속도, 발음, 전달력을 바탕으로 지금 필요한 연습을 알려드려요.",
  },
  {
    icon: Target,
    title: "상황별 말하기 연습",
    description: "면접, 발표, 회의, 대화에 맞는 질문으로 실전처럼 연습해요.",
  },
  {
    icon: BarChart3,
    title: "성장 리포트",
    description: "주간과 월간 변화를 한눈에 보고 달라진 습관을 확인해요.",
  },
];

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="마디마디 홈">
      <span className="brand-mark" aria-hidden="true">
        {[12, 20, 30, 22, 15].map((height, index) => (
          <span key={index} style={{ height }} />
        ))}
      </span>
      <span>마디마디</span>
    </a>
  );
}

export default function Home() {
  return (
    <main id="top" className="site-shell">
      <header className="site-header">
        <Logo />
        <nav className="desktop-nav" aria-label="주요 메뉴">
          <a href="#features">기능</a>
          <a href="#practice">사용 방법</a>
          <a href="#stories">후기</a>
          <a href="#pricing">요금제</a>
        </nav>
        <div className="header-actions">
          <Button asChild variant="ghost" className="login-button">
            <a href="/login">로그인</a>
          </Button>
          <Button asChild className="primary-button header-cta">
            <a href="/signup">무료 시작하기</a>
          </Button>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles aria-hidden="true" />
            말 한마디부터 달라지는 AI 스피치 코치
          </div>
          <h1 id="hero-title">
            당신의 말버릇을 분석하고
            <br />
            <span>더 나은 말하기 습관</span>을
            <br />
            만들어드립니다.
          </h1>
          <p>
            AI가 음성을 분석하여 말버릇과 말하기 속도, 발음, 전달력을
            세밀하게 확인하고 오늘 바로 실천할 수 있는 피드백을 드려요.
          </p>
          <div className="hero-actions">
            <Button asChild size="lg" className="primary-button hero-primary">
              <a href="/signup">
                무료로 시작하기
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="demo-button">
              <a href="#practice">
                <Play aria-hidden="true" />
                데모 체험
              </a>
            </Button>
          </div>
          <div className="hero-note">
            <span><CheckCircle2 />카드 등록 없이 시작</span>
            <span><CheckCircle2 />첫 분석 무료</span>
          </div>
        </div>

        <div className="analysis-stage" aria-label="마디마디 분석 결과 예시">
          <div className="stage-glow" />
          <div className="analysis-card">
            <div className="card-toolbar">
              <span className="window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>오늘의 말하기 분석</span>
              <span className="live-pill"><i /> 분석 완료</span>
            </div>

            <div className="score-area">
              <div className="score-ring">
                <strong>82</strong>
                <span>점</span>
              </div>
              <div className="score-summary">
                <span>지난 기록보다</span>
                <strong>+6점 성장했어요</strong>
                <small>조금 더 자연스러워지고 있어요.</small>
              </div>
            </div>

            <div className="wave-panel">
              <div className="wave-bars" aria-hidden="true">
                {waveform.map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="wave-meta">
                <span><Clock3 />01:24</span>
                <span>발표 연습</span>
              </div>
            </div>

            <div className="habit-list">
              <div>
                <span className="habit-word">음…</span>
                <span className="habit-bar"><i style={{ width: "72%" }} /></span>
                <strong>8회</strong>
              </div>
              <div>
                <span className="habit-word">그…</span>
                <span className="habit-bar"><i style={{ width: "45%" }} /></span>
                <strong>5회</strong>
              </div>
              <div>
                <span className="habit-word">저기…</span>
                <span className="habit-bar"><i style={{ width: "32%" }} /></span>
                <strong>3회</strong>
              </div>
            </div>
          </div>

          <div className="floating-tip">
            <span><Mic2 aria-hidden="true" /></span>
            <div>
              <small>AI 코치의 한마디</small>
              <strong>첫 문장을 조금 더 천천히 말해보세요.</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="feature-section" aria-labelledby="feature-title">
        <div className="section-heading">
          <span>CORE FEATURES</span>
          <h2 id="feature-title">말하기의 모든 마디를 놓치지 않도록</h2>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="feature-card">
              <div className="feature-icon"><Icon aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="practice" className="practice-banner">
        <div>
          <span>첫 연습은 1분이면 충분해요</span>
          <h2>완벽하게 말하려고 하지 말고, 일단 말해보세요.</h2>
        </div>
        <Button asChild size="lg" className="light-button">
          <a href="/signup">내 말버릇 확인하기 <ArrowRight /></a>
        </Button>
      </section>

      <footer className="site-footer" id="stories">
        <Logo />
        <p>말 한마디, 몸의 한마디까지. 더 나은 소통을 위한 연습.</p>
        <span id="pricing">© 2026 마디마디</span>
      </footer>
    </main>
  );
}
