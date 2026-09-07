# 마디마디

AI 말하기 코칭 서비스의 GitHub 이전용 모노레포입니다. 기존 화면은 `frontend`, 로그인·회원가입·소셜 로그인·분석 저장 API는 `backend`로 분리되어 있습니다.

## 폴더 구조

```text
madimadi/
├── frontend/  # Next.js (Vercel용)
└── backend/   # Express + PostgreSQL (Render용)
```

프론트엔드는 `/api/*` 요청을 `BACKEND_URL`로 프록시하므로 브라우저에서는 같은 도메인처럼 동작합니다. 로그인 쿠키와 Google/카카오 콜백도 이 경로를 사용합니다.

## 로컬 실행

필요한 것: Node.js 22 이상, PostgreSQL

1. 저장소 루트에서 패키지를 설치합니다.

   ```bash
   npm install
   ```

2. 환경변수 파일을 만듭니다.

   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

3. `backend/.env`의 `DATABASE_URL`을 실제 PostgreSQL 주소로 바꾼 뒤 테이블을 만듭니다.

   ```bash
   npm run db:migrate
   ```

4. 프론트와 백엔드를 함께 실행합니다.

   ```bash
   npm run dev
   ```

- 프론트: `http://localhost:3000`
- 백엔드 상태 확인: `http://localhost:4000/health`

## 필수 환경변수

| 위치 | 변수 | 값 |
| --- | --- | --- |
| frontend | `BACKEND_URL` | 로컬 `http://localhost:4000`, 배포 후 Render 주소 |
| backend | `DATABASE_URL` | PostgreSQL 연결 주소 |
| backend | `APP_URL` | 로컬 `http://localhost:3000`, 배포 후 Vercel 주소 |
| backend | `NODE_ENV` | 배포 환경에서는 `production` |
| backend | `GEMINI_API_KEY` | Google AI Studio API 비밀키. 프론트나 GitHub에 넣지 않음 |
| backend | `GEMINI_TRANSCRIPTION_MODEL` | 선택 사항. 기본값 `gemini-3.5-transcribe` |
| backend | `GEMINI_COACH_MODEL` | 선택 사항. 기본값 `gemini-3.5-flash-lite` |

말하기 분석은 브라우저의 실시간 자막이 아니라 녹음 원본을 Gemini 음성 인식 API로 다시 전사한 결과를 기준으로 계산합니다. 따라서 추임새·머뭇거림·단어 반복이 실시간 자막에서 빠져도 최종 분석에는 반영될 수 있습니다.

로그인 후에는 대시보드, 음성 분석, 상황별 연습, 성장 리포트, AI 코치, 배지, 설정을 사용할 수 있습니다. 성장 리포트와 배지는 저장된 분석 기록에서 자동으로 계산되며, AI 코치는 최근 5개의 분석 기록을 참고해 답변합니다.

Google/카카오 로그인은 `backend/.env.example`의 앱 키도 채워야 합니다. 공급자 콘솔의 콜백 주소는 아래 형식으로 등록합니다.

```text
https://프론트주소/api/auth/oauth/google/callback
https://프론트주소/api/auth/oauth/kakao/callback
```

## GitHub에 올리기

압축을 푼 폴더에서 다음 명령을 실행합니다.

```bash
git init
git add .
git commit -m "feat: split madimadi frontend and backend"
git branch -M main
git remote add origin https://github.com/내아이디/내저장소.git
git push -u origin main
```

`.env` 파일은 Git에 포함되지 않습니다. 비밀키는 GitHub에 올리지 말고 배포 서비스의 환경변수에 입력하세요.

## 배포 시 기준 경로

| 서비스 | Root Directory | Build Command | Start/Output |
| --- | --- | --- | --- |
| Vercel | `frontend` | `npm run build` | Next.js 자동 감지 |
| Render Web Service | `backend` | `npm install && npm run build` | `npm start` |

Render PostgreSQL을 만든 뒤 최초 한 번 `npm run db:migrate --workspace backend`를 실행해야 합니다.


-----
