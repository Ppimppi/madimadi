import {
  ArrowRight,
  AudioLines,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  Mic2,
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

const practiceSteps = [
  {
    number: "01",
    icon: Mic2,
    title: "말하기를 녹음해요",
    description: "음성만 빠르게 녹음하거나 카메라를 켜고 시선과 자세까지 함께 확인해요.",
  },
  {
    number: "02",
    icon: Bot,
    title: "AI 분석을 확인해요",
    description: "반복한 말버릇, 말하기 속도와 전달력, 표정과 자세를 한 화면에서 확인해요.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "피드백대로 다시 연습해요",
    description: "AI 코치의 제안과 상황별 질문으로 연습하고 성장 리포트에서 변화를 확인해요.",
  },
];

const stories = [
  {
    tag: "발표 연습",
    quote: "막연히 긴장된다고만 생각했는데, 반복하는 표현과 말하기 속도를 같이 보니 고칠 지점이 선명해졌어요.",
    name: "발표를 준비하는 사용자",
  },
  {
    tag: "면접 준비",
    quote: "질문에 답하고 바로 피드백을 받으니 혼자 연습할 때보다 다음 답변에서 무엇을 바꿀지 알기 쉬웠어요.",
    name: "면접을 준비하는 사용자",
  },
  {
    tag: "일상 대화",
    quote: "주간 리포트로 변화를 확인하면서 무의식적으로 쓰던 추임새를 조금씩 줄이는 데 집중할 수 있었어요.",
    name: "말하기 습관을 고치는 사용자",
  },
];

const plans = [
  {
    name: "베이직",
    price: "0원",
    period: "베타 기간",
    description: "마디마디의 핵심 기능으로 말하기 연습을 시작하는 플랜",
    features: ["음성·영상 분석", "상황별 말하기 연습", "AI 피드백", "주간·월간 성장 리포트"],
    action: "베이직으로 시작하기",
    href: "/signup",
  },
  {
    name: "프로",
    price: "출시 예정",
    period: "정식 출시 후 안내",
    description: "더 깊은 분석과 꾸준한 코칭이 필요한 사용자를 위한 플랜",
    features: ["베이직의 모든 기능", "고급 말하기 분석", "맞춤 훈련 추천", "리포트 장기 보관"],
    action: "베타에서 먼저 시작하기",
    href: "/signup",
    featured: true,
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
          <a href="#how-it-works">사용 방법</a>
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
          </div>
          <div className="hero-note">
            <span><CheckCircle2 />카드 등록 없이 시작</span>
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
          <p>분석부터 반복 연습과 성장 확인까지, 한 흐름으로 이어집니다.</p>
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

      <section id="how-it-works" className="how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <span>HOW IT WORKS</span>
          <h2 id="how-title">녹음하고, 확인하고, 다시 말해보세요</h2>
          <p>복잡한 설정 없이 세 단계로 말하기 연습을 이어갈 수 있어요.</p>
        </div>
        <div className="step-grid">
          {practiceSteps.map(({ number, icon: Icon, title, description }) => (
            <article key={number} className="step-card">
              <div className="step-card-top">
                <span>{number}</span>
                <div><Icon aria-hidden="true" /></div>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="stories" className="story-section" aria-labelledby="story-title">
        <div className="section-heading">
          <span>USER STORIES</span>
          <h2 id="story-title">말하기를 연습하는 순간들</h2>
          <p>마디마디로 연습할 때 기대할 수 있는 변화를 소개합니다.</p>
        </div>
        <div className="story-grid">
          {stories.map(({ tag, quote, name }) => (
            <article key={tag} className="story-card">
              <span>{tag}</span>
              <blockquote>“{quote}”</blockquote>
              <p>{name}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="pricing-section" aria-labelledby="pricing-title">
        <div className="section-heading">
          <span>PLANS</span>
          <h2 id="pricing-title">나에게 맞는 방식으로 시작하세요</h2>
          <p>현재 베타 기간에는 베이직 기능을 이용할 수 있으며, 프로 플랜은 정식 출시와 함께 안내됩니다.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article key={plan.name} className={`pricing-card ${plan.featured ? "is-featured" : ""}`}>
              {plan.featured && <span className="plan-badge">COMING SOON</span>}
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}><CheckCircle2 aria-hidden="true" />{feature}</li>
                ))}
              </ul>
              <Button asChild size="lg" className={plan.featured ? "primary-button plan-button" : "plan-button plan-button-outline"}>
                <a href={plan.href}>{plan.action}<ArrowRight aria-hidden="true" /></a>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="practice-banner">
        <div>
          <span>첫 연습은 1분이면 충분해요</span>
          <h2>완벽하게 말하려고 하지 말고, 일단 말해보세요.</h2>
        </div>
        <Button asChild size="lg" className="light-button">
          <a href="/signup">내 말버릇 확인하기 <ArrowRight /></a>
        </Button>
      </section>

      <footer className="site-footer">
        <Logo />
        <p>말 한마디, 몸의 한마디까지. 더 나은 소통을 위한 연습.</p>
        <span>© 2026 마디마디</span>
      </footer>
    </main>
  );
}
