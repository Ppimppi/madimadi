# 마디마디

> 음성·내용·영상 데이터를 함께 분석하는 AI 말하기 코칭 서비스

마디마디는 발표, 면접, 회의, 일상 대화에서 어려움을 겪는 사용자가 자신의 말하기 습관을 객관적으로 확인하고 반복 연습할 수 있도록 돕는 웹 서비스입니다.

사용자의 음성을 전사해 말하기 속도와 추임새를 분석하고, 상황별 질문에 대한 답변의 관련성과 개연성을 AI로 평가합니다. 카메라를 사용하는 경우 영상 원본을 서버에 저장하지 않고 브라우저에서 시선·자세·표정 지표를 계산합니다.

분석 결과는 계정에 저장되며, 같은 연습의 전후 비교, 대시보드, 성장 리포트, 배지와 AI 코치에 활용됩니다.

---

## 핵심 기능

### 1. 통합 말하기 연습·분석

자유 말하기 또는 상황별 연습 모드를 선택하고 음성·영상을 녹화할 수 있습니다.

지원 모드:

- 자유 말하기
- 면접
- 발표
- 회의
- 대화

한 번의 연습에서 다음 항목을 함께 분석합니다.

- 말하기 속도
- 추임새 사용 횟수와 종류
- 인접 단어 반복
- 질문 관련성
- 답변의 전개 개연성
- 상황 적합성
- 근거의 구체성
- 카메라 응시 추정
- 얼굴 감지 비율
- 상체 정렬
- 자세 안정도
- 표정 자연스러움과 변화량

### 2. 이중 음성 인식 구조

녹음 중에는 브라우저의 Web Speech API를 이용해 실시간 자막을 제공합니다.

분석 시에는 녹음 원본을 백엔드로 전송하고 Gemini 전사 모델을 통해 한국어 전사문을 다시 생성합니다. 실시간 자막은 즉각적인 사용자 경험을 담당하고, Gemini 전사는 최종 분석 품질을 담당합니다.

Gemini 전사 서버가 일시적으로 혼잡한 경우:

1. 일정 간격으로 자동 재시도
2. 재시도 후에도 실패하면 실시간 자막을 이용한 대체 분석
3. 녹음 결과를 유지해 재분석 가능

### 3. AI 기반 상황별 질문

면접, 발표, 회의, 대화 모드에서는 Gemini가 매번 새로운 질문 후보를 생성합니다.

AI가 생성한 질문은 사용자에게 바로 표시되지 않으며 서버에서 다음 조건을 검증합니다.

- 선택한 연습 모드와 일치하는지
- 다른 모드의 금지 요소가 포함되지 않았는지
- 선택된 세부 주제에 적합한지
- 최근 질문과 지나치게 유사하지 않은지
- 질문 길이와 팁 형식이 올바른지

검증에 실패하거나 AI 서버를 사용할 수 없는 경우에는 모드별로 준비된 대체 질문을 사용합니다.

### 4. 질문 내용과 개연성 평가

상황별 연습에서는 단순한 키워드 포함 여부가 아니라 답변의 의미와 흐름을 평가합니다.

| 평가 항목 | 가중치 |
| --- | ---: |
| 질문 관련성 | 35% |
| 전개 개연성 | 30% |
| 상황 적합성 | 20% |
| 근거 구체성 | 15% |

연습 모드별로 다른 기준이 적용됩니다.

- 면접: 경험·행동·결과와 직무의 연결
- 발표: 도입·핵심 주장·근거·사례·결론의 흐름
- 회의: 원인·대안·우선순위·담당자·기한의 현실성
- 대화: 상대의 감정과 관계 및 대화 맥락

질문과 관련 없는 답변이 말하기 속도나 자세만으로 높은 점수를 받지 않도록 내용 점수에 따른 종합 점수 상한도 적용합니다.

### 5. 브라우저 기반 영상·표정 분석

카메라 분석은 MediaPipe Face Landmarker와 Pose Landmarker를 이용해 브라우저 안에서 수행됩니다.

약 300ms 간격으로 영상을 샘플링해 다음 지표를 계산합니다.

- 얼굴 감지 비율
- 카메라 응시 추정 비율
- 머리와 어깨 정렬
- 상체 움직임 안정도
- 어깨 기울기 발생 횟수
- 머리 회전 발생 횟수
- 미소 감지 비율
- 얼굴 긴장 비율
- 표정 변화량

영상 원본은 마디마디 서버나 데이터베이스에 업로드하지 않습니다. 브라우저에서 계산된 요약 지표만 백엔드로 전달됩니다.

해당 결과는 일반 웹캠 한 대를 기반으로 계산한 추정치이며, 의료·심리 진단이나 전문 시선 추적 결과가 아닙니다.

### 6. 이전 연습과 전후 비교

분석 결과를 저장하기 전에 동일한 사용자와 동일한 연습 모드의 직전 기록을 조회합니다.

비교 가능한 항목:

- 종합 점수
- 추임새 횟수
- 말하기 속도
- 영상 점수
- 카메라 응시
- 상체 정렬
- 표정 자연스러움
- 내용 적합성

발표 기록은 직전 발표 기록과, 면접 기록은 직전 면접 기록과 비교합니다.

### 7. 대시보드와 성장 리포트

저장된 분석 기록으로 다음 통계를 계산합니다.

- 전체 분석 횟수
- 전체 연습 시간
- 최근 7일 연습 횟수
- 최근 7일 평균 점수
- 최근 7일 추임새 합계
- 평균 말하기 속도
- 직전 기간 대비 변화
- 연속 연습일
- 일별 점수·속도·추임새 그래프
- 주간 및 월간 성장 리포트

월간 리포트는 `Asia/Seoul` 시간대를 기준으로 현재 달 1일부터 다음 달 1일 전까지의 기록만 사용합니다.

### 8. AI 코치

AI 코치는 사용자가 완료한 최근 분석 기록을 바탕으로 연습 방법을 제안합니다.

AI 코치가 참고하는 정보:

- 사용자의 연습 목표
- 최근 분석 5개
- 종합 점수
- 말하기 속도
- 추임새 종류와 횟수
- 영상 분석 지표
- 현재 대화 내용

분석 기록에 없는 사실은 지어내지 않도록 제한하고, 사용자가 바로 실행할 수 있는 연습 방법을 포함하도록 구성했습니다.

### 9. 배지

별도의 배지 저장 테이블을 사용하지 않고 분석 기록에서 실시간으로 성취 여부를 계산합니다.

지원 배지:

- 첫 분석 완료
- 7일 연속 연습
- 말버릇 50% 감소
- 30일 연속 연습
- 100회 분석 완료
- 최근 3회 추임새 0회

### 10. 회원 기능

- 이메일 회원가입 및 로그인
- Google 로그인
- 카카오 로그인
- 로그아웃
- 프로필 이름 수정
- 연습 목표 변경
- 비밀번호 변경
- 회원 탈퇴
- 세션 기반 로그인 유지

---

## 분석 방식

마디마디는 모든 평가를 생성형 AI에 맡기지 않습니다.

측정 기준이 명확한 부분은 규칙 기반 코드로 처리하고, 문맥 이해가 필요한 부분만 AI로 평가합니다.

### 말하기 습관 점수

말하기 습관 점수는 다음 항목으로 계산합니다.

```text
기본 점수 96
- 말하기 속도 감점
- 추임새 비율 및 분당 추임새 감점
- 인접 단어 반복 감점
```

권장 말하기 속도는 90~160어절/분으로 설정했습니다.

짧은 녹음으로 우연히 높은 점수를 받는 문제를 줄이기 위해 분석 신뢰도 상한을 적용합니다.

| 녹음 시간 | 최고 가능 점수 |
| --- | ---: |
| 15초 미만 | 68점 |
| 15초 이상 30초 미만 | 82점 |
| 30초 이상 | 100점 |

### 종합 점수

| 분석 조건 | 종합 점수 구성 |
| --- | --- |
| 상황 질문 + 영상 | 말하기 습관 30% + 내용 45% + 영상 25% |
| 상황 질문 + 영상 없음 | 말하기 습관 45% + 내용 55% |
| 자유 말하기 + 영상 | 말하기 습관 70% + 영상 30% |
| 자유 말하기 + 영상 없음 | 말하기 습관 점수 100% |

내용 평가가 필요한 상황에서 AI 내용 평가가 일시적으로 실패하면 전달 방식은 분석하되 종합 점수를 최대 70점으로 제한합니다.

추가 점수 상한:

- 질문 관련성 30점 미만: 종합 최대 49점
- 전개 개연성 30점 미만: 종합 최대 54점
- 내용 평가 총점 50점 미만: 종합 최대 64점

---

## 기술 스택

### Frontend

- TypeScript
- Next.js 16
- React 19
- MediaRecorder API
- Web Speech API
- MediaPipe Tasks Vision
- Recharts
- shadcn/ui
- Tailwind CSS

### Backend

- TypeScript
- Node.js
- Express 5
- Drizzle ORM
- PostgreSQL
- Google Gemini API
- express-rate-limit
- Helmet
- cookie-parser

### Authentication

- 자체 이메일·비밀번호 인증
- 세션 쿠키
- Google OAuth 2.0
- Kakao OAuth 2.0

### Deployment

- Vercel Services
- Neon PostgreSQL

### Collaboration

- GitHub
- Figma
- Notion

---

## 시스템 구조

```mermaid
flowchart TD
    A["사용자 브라우저<br/>Next.js · React"] --> B["Vercel Rewrite"]
    B --> C["Express API"]
    C --> D["PostgreSQL<br/>회원·분석 기록"]
    C --> E["Gemini API<br/>전사·질문·내용 평가·코치"]
    A --> F["MediaPipe<br/>브라우저 영상 분석"]
    F --> C
```

### 데이터 처리 원칙

| 데이터 | 처리 위치 | 앱 DB 저장 여부 |
| --- | --- | --- |
| 영상 원본 | 사용자 브라우저 | 저장하지 않음 |
| 영상 분석 수치 | 브라우저 → 백엔드 | 저장 |
| 음성 원본 | 브라우저 → 백엔드 → Gemini 전사 | 앱 DB에 저장하지 않음 |
| 실시간 자막 | 사용자 브라우저 | 장애 대체 분석 시 사용 가능 |
| 최종 전사문 | Gemini → 백엔드 | 저장 |
| 분석 점수·피드백 | 백엔드 | 저장 |

---

## 프로젝트 구조

```text
madimadi/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # 메인 랜딩 페이지
│   │   ├── login/                    # 로그인
│   │   ├── signup/                   # 회원가입
│   │   ├── dashboard/                # 대시보드
│   │   ├── practice/                 # 통합 말하기 연습·분석
│   │   ├── report/                   # 성장 리포트
│   │   ├── coach/                    # AI 코치
│   │   ├── badges/                   # 배지
│   │   └── settings/                 # 회원·서비스 설정
│   ├── components/
│   │   ├── auth/                     # 인증 UI
│   │   ├── dashboard/                # 공통 워크스페이스 UI
│   │   ├── practice/                 # 녹음·분석 UI
│   │   └── ui/                       # 공통 UI 컴포넌트
│   ├── hooks/
│   │   └── use-current-user.ts       # 로그인 사용자 확인
│   ├── lib/
│   │   ├── motion-analysis.ts        # MediaPipe 영상 분석
│   │   ├── speech-analysis.ts        # 프론트 분석 타입
│   │   └── workspace.ts              # 공통 데이터 타입
│   └── public/mediapipe/             # MediaPipe 모델과 WASM
│
├── backend/
│   ├── drizzle/                      # PostgreSQL 마이그레이션
│   └── src/
│       ├── index.ts                  # Express 진입점
│       ├── db.ts                     # PostgreSQL 연결
│       ├── schema.ts                 # DB 스키마
│       ├── auth.ts                   # 세션·비밀번호 인증
│       ├── oauth.ts                  # OAuth 보안 처리
│       ├── speech-analysis.ts        # 추임새·속도 분석
│       ├── gemini-transcription.ts   # Gemini 음성 전사
│       ├── gemini-retry.ts           # Gemini 재시도
│       ├── content-analysis.ts       # 답변 내용·개연성 평가
│       ├── motion-analysis.ts        # 영상 지표 검증·점수화
│       ├── practice-question.ts      # 상황별 질문 생성·검증
│       ├── insights.ts               # 리포트·배지·통계
│       └── routes/
│           ├── auth.ts               # 회원 API
│           ├── analyses.ts           # 분석 API
│           ├── practice.ts           # 질문 생성 API
│           └── coach.ts              # AI 코치 API
│
├── package.json                      # npm workspace 설정
├── package-lock.json                 # 패키지 버전 고정
└── vercel.json                       # Vercel 서비스·경로 설정
```

---

## 주요 API

### 회원

| Method | Endpoint | 기능 |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | 회원가입 및 세션 생성 |
| `POST` | `/api/auth/login` | 이메일 로그인 |
| `POST` | `/api/auth/logout` | 로그아웃 |
| `GET` | `/api/auth/me` | 현재 사용자 조회 |
| `PATCH` | `/api/auth/profile` | 이름·목표 수정 |
| `POST` | `/api/auth/password` | 비밀번호 변경 |
| `DELETE` | `/api/auth/account` | 회원 탈퇴 |
| `GET` | `/api/auth/oauth/google` | Google 로그인 시작 |
| `GET` | `/api/auth/oauth/kakao` | 카카오 로그인 시작 |

### 연습·분석

| Method | Endpoint | 기능 |
| --- | --- | --- |
| `POST` | `/api/practice/question` | 상황별 AI 질문 생성 |
| `POST` | `/api/analyses` | 음성 원본 전사·분석·저장 |
| `POST` | `/api/analyses/text` | 실시간 자막 기반 대체 분석 |
| `GET` | `/api/analyses/recent` | 최근 분석 상세 정보 |
| `GET` | `/api/analyses/summary` | 대시보드 통계 |
| `GET` | `/api/analyses/report` | 주간·월간 성장 리포트 |
| `GET` | `/api/analyses/badges` | 배지와 진행률 |
| `POST` | `/api/coach` | 최근 기록 기반 AI 코치 |

### 서버 상태

| Method | Endpoint | 기능 |
| --- | --- | --- |
| `GET` | `/health` | API와 DB 연결 상태 확인 |

---

## 데이터베이스

### `users`

회원 기본 정보와 비밀번호 해시 및 연습 목표를 저장합니다.

### `sessions`

로그인 세션의 토큰 해시와 만료 시간을 저장합니다.

브라우저에는 원본 세션 토큰이 쿠키로 전달되지만 DB에는 해당 토큰의 SHA-256 해시만 저장됩니다.

### `oauth_accounts`

Google·카카오 계정과 마디마디 사용자의 연결 정보를 저장합니다.

### `analyses`

각 연습의 다음 정보를 저장합니다.

- 연습 모드
- 최종 전사문
- 녹음 시간
- 단어 수
- 추임새 수와 종류
- 말하기 속도
- 종합 점수
- 음성·내용 피드백
- 영상 분석 지표
- 생성 시각

회원 삭제 시 외래 키의 `ON DELETE CASCADE` 설정에 따라 해당 회원의 세션, OAuth 연결과 분석 기록도 함께 삭제됩니다.

---

## 보안 및 안정성

- 비밀번호 원문 미저장
- 사용자별 salt와 PBKDF2-SHA256 100,000회 적용
- `timingSafeEqual`을 이용한 비밀번호 해시 비교
- HTTP Only 세션 쿠키
- SameSite 쿠키 정책
- 운영 환경 Secure 쿠키
- 세션 원본 대신 SHA-256 해시 저장
- OAuth state 검증
- 동일 출처 요청 검증
- Helmet 보안 헤더
- 인증 API 요청 횟수 제한
- AI 분석 요청 횟수 제한
- AI 코치와 질문 생성 요청 제한
- 오디오 크기 및 MIME type 검증
- AI JSON 응답 스키마 제한
- AI 응답에 대한 서버 재검증
- Gemini 일시적 오류 재시도
- 질문 및 음성 분석 fallback
- 영상 원본 서버 미저장

---

## 로컬 실행

### 요구 사항

- Node.js 22.13 이상
- npm
- PostgreSQL 데이터베이스
- Google Gemini API 키

### 1. 저장소 설치

저장소 최상단에서 실행합니다.

```bash
npm install
```

루트 프로젝트는 npm workspace를 사용하므로 frontend와 backend 의존성이 함께 설치됩니다.

### 2. 백엔드 환경변수

`backend/.env` 파일을 직접 생성합니다.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
APP_URL=http://localhost:3000
NODE_ENV=development

GEMINI_API_KEY=your_gemini_api_key

# 선택 사항
GEMINI_TRANSCRIPTION_MODEL=gemini-3.5-transcribe
GEMINI_FEEDBACK_MODEL=gemini-3.5-flash-lite
GEMINI_QUESTION_MODEL=gemini-3.5-flash-lite
GEMINI_COACH_MODEL=gemini-3.5-flash-lite

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Kakao OAuth
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
```

OAuth를 사용하지 않는 경우 관련 키를 비워둘 수 있지만 해당 소셜 로그인은 작동하지 않습니다.

### 3. 프론트엔드 환경변수

로컬 개발에서는 Next.js가 `/api` 요청을 로컬 Express 서버로 전달해야 합니다.

`frontend/.env.local` 파일을 생성합니다.

```env
BACKEND_URL=http://localhost:4000
```

Vercel Services로 함께 배포하는 경우에는 최상단 `vercel.json`이 서비스 연결을 담당하므로 `BACKEND_URL`이 필요하지 않을 수 있습니다.

### 4. 데이터베이스 마이그레이션

```bash
npm run db:migrate
```

### 5. 개발 서버 실행

```bash
npm run dev
```

실행 주소:

- 프론트엔드: `http://localhost:3000`
- 백엔드 상태 확인: `http://localhost:4000/health`

---

## 검사 및 빌드

### 백엔드 타입 검사

```bash
npm run typecheck
```

### 프론트엔드 ESLint

```bash
npm run lint
```

### 전체 빌드

```bash
npm run build
```

---

## Vercel 배포

이 저장소는 최상단 `vercel.json`에서 Vercel Services를 사용해 frontend와 backend를 함께 배포하도록 구성되어 있습니다.

```json
{
  "services": {
    "frontend": {
      "root": "frontend/",
      "framework": "nextjs"
    },
    "backend": {
      "root": "backend/",
      "framework": "express",
      "entrypoint": "src/index.ts",
      "buildCommand": "npm run db:migrate && npm run build"
    }
  }
}
```

경로 분배:

- `/api/*` → Express backend
- 나머지 경로 → Next.js frontend

### 배포 순서

1. GitHub 저장소를 Vercel 프로젝트에 연결합니다.
2. 저장소 루트를 Root Directory로 사용합니다.
3. 필요한 환경변수를 Vercel에 등록합니다.
4. `APP_URL`을 실제 Production 주소로 설정합니다.
5. Neon PostgreSQL의 `DATABASE_URL`을 등록합니다.
6. 배포를 실행합니다.
7. `/health`와 로그인·분석 기능을 확인합니다.

### Vercel 필수 환경변수

```text
DATABASE_URL
APP_URL
NODE_ENV
GEMINI_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
KAKAO_REST_API_KEY
KAKAO_CLIENT_SECRET
```

선택적인 모델 환경변수:

```text
GEMINI_TRANSCRIPTION_MODEL
GEMINI_FEEDBACK_MODEL
GEMINI_QUESTION_MODEL
GEMINI_COACH_MODEL
```

`APP_URL`에는 마지막 `/`를 제외한 실제 서비스 주소를 입력합니다.

```text
https://your-project.vercel.app
```

---

## OAuth 설정

### Google callback URL

```text
https://your-project.vercel.app/api/auth/oauth/google/callback
```

Google Cloud Console의 승인된 리디렉션 URI에 등록해야 합니다.

필요한 동의 범위:

```text
openid
email
profile
```

### Kakao callback URL

```text
https://your-project.vercel.app/api/auth/oauth/kakao/callback
```

카카오 디벨로퍼스에서 다음 설정이 필요합니다.

- REST API 키
- Client Secret 활성화
- Redirect URI 등록
- 카카오 로그인 활성화
- 이메일 제공 동의
- 프로필 닉네임 제공 동의

---

## 팀 구성 및 역할

본 프로젝트는 4명이 공동으로 제작했습니다.

| 담당 | 팀원 | 주요 역할 |
| --- | --- | --- |
| 백엔드·AI 통합·배포 | `[변지현]` | Express API, PostgreSQL, 회원 인증, OAuth, Gemini 연동, 분석 알고리즘, Vercel 배포 |
| 프론트엔드·미디어 기능 | `[황수미]` | Next.js 화면, MediaRecorder, 실시간 자막, 분석 결과, 대시보드와 그래프 |
| UI/UX 디자인 | `[백지현]` | 사용자 흐름, 화면 구성, 컬러·컴포넌트와 Figma 디자인 |
| 브랜딩·발표 자료 | `[박승하]` | 서비스 콘셉트, 발표 자료, 시연 시나리오와 발표 스토리라인 |

### 공동 개발 영역

프론트엔드와 백엔드가 연결되는 기능은 두 개발 팀원이 함께 데이터 형식과 동작을 조율했습니다.

- 녹음 데이터 전송과 분석 결과 반환
- 영상 분석 지표 전달
- 상황별 질문 생성과 표시
- 로그인 화면과 세션 API
- 대시보드 통계와 그래프
- AI 코치 대화와 최근 기록 연결
- 오류 처리와 배포 후 통합 테스트

---

## 생성형 AI 활용 범위

본 프로젝트의 개발 과정에서 생성형 AI를 개발 보조 도구로 활용했습니다.

주요 활용 영역:

- UI/CSS 구현 보조
- 반복적인 컴포넌트 코드 작성 보조
- 오류 원인 탐색 및 디버깅 제안
- 문서와 코드 구조 정리

팀이 직접 정의하고 검증한 영역:

- 서비스 요구사항
- 프론트엔드·백엔드 구조
- 데이터베이스 구조
- 음성·내용·영상 분석 역할 분리
- 말하기 점수 계산 기준
- 내용 점수 가중치와 종합 점수 상한
- 모드별 질문 검증 규칙
- 영상 원본을 저장하지 않는 개인정보 처리 방식
- Gemini 오류 재시도와 fallback
- 동일 모드 전후 비교
- 주간·월간 리포트 계산 기준

생성형 AI의 결과를 그대로 사용하는 것이 아니라, 프로젝트 요구사항에 맞게 검토·수정·통합하고 실제 동작을 확인하는 방식으로 활용했습니다.

---

## 현재 한계

마디마디는 해커톤을 위한 MVP로, 다음 한계가 있습니다.

- 독립적인 음소 단위 발음 정확도 분석은 제공하지 않습니다.
- 추임새 분석은 정해진 단어 목록과 반복 규칙을 기반으로 합니다.
- 카메라 응시는 전문 시선 추적 장비가 아닌 얼굴 랜드마크 기반 추정치입니다.
- 생성형 AI의 내용 평가는 실행마다 일부 차이가 발생할 수 있습니다.
- 알림 설정은 현재 브라우저 localStorage에만 저장되며 실제 푸시·이메일 알림을 발송하지 않습니다.
- AI 코치 대화는 localStorage에 기록되지만 새로고침 후 복원 기능은 완성되지 않았습니다.
- 현재 웹 서비스만 제공하며 별도의 React Native 모바일 앱은 없습니다.
- 별도의 Redis 캐시와 분산 rate limit은 적용하지 않았습니다.
- 자동화 테스트보다 타입 검사, lint, build 및 수동 기능 검증을 중심으로 개발했습니다.

---

## 향후 개선 방향

- 발음·억양·음높이 전용 분석
- 사용자별 추임새 사전
- 실제 알림과 연습 일정 관리
- AI 코치 대화 복원
- 분석 결과 수정 및 삭제
- 이메일 변경과 계정 연결 관리
- 모바일 앱
- 접근성 및 모바일 UI 강화
- 자동화 테스트 추가
- Redis 기반 분산 rate limit
- 실제 사용자 평가 데이터를 이용한 점수 기준 보정
- 장기간 분석 기록의 고급 시각화

---

## 개인정보 처리 요약

- 비밀번호 원문을 저장하지 않습니다.
- Gemini API 키와 OAuth 비밀키는 서버 환경변수로 관리합니다.
- 원본 영상을 마디마디 서버나 데이터베이스에 저장하지 않습니다.
- 음성 원본은 전사를 위해 백엔드와 Gemini API로 전송되지만 애플리케이션 데이터베이스에는 저장하지 않습니다.
- 데이터베이스에는 전사문과 분석 지표 및 피드백을 저장합니다.
- 회원 탈퇴 시 회원과 연결된 분석 기록을 함께 삭제합니다.

---

## License

본 저장소는 해커톤 출품 및 교육 목적으로 제작되었습니다.

저작권과 사용 범위는 팀 내부 정책 및 출품 대회 규정에 따릅니다.
