# Pool-go AI (formerly ROOT CBT)

React/Vite 프런트엔드와 시험 생성 API가 함께 있는 프로젝트입니다.

## Local Development

사전 준비:
- Node.js 20+

설치:
```bash
npm install
```

환경 변수:
- `.env.local` 또는 `.env`에 `OPENAI_API_KEY` 설정
- Supabase를 쓸 경우 `VITE_SUPABASE_COMBINED_URL` 또는 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 설정

실행:
```bash
npm run dev
npm run dev:api
```

기본 동작:
- 프런트엔드: `http://127.0.0.1:3000`
- API 서버: `http://127.0.0.1:8787`
- 로컬에서는 Vite가 `/api` 요청을 API 서버로 프록시합니다.

## Cloudflare Pages Deployment

이 저장소는 이제 `functions/api/*`를 포함하므로 Cloudflare Pages에 프런트와 API를 함께 배포할 수 있습니다.

Pages 설정:
- Build command: `npm run build`
- Build output directory: `dist`

Pages 환경 변수:
- `OPENAI_API_KEY` 필수
- `OPENAI_MODEL` 선택, 기본값 `gpt-5.4-mini`
- `VITE_SUPABASE_COMBINED_URL` 또는 `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`VITE_API_BASE_URL` 사용 기준:
- Cloudflare Pages에서 이 저장소를 그대로 배포하면 비워둡니다.
- 프런트와 API가 서로 다른 도메인에 배포될 때만 API 원본 URL로 설정합니다.

## API Endpoints

- `GET /api/health`
- `POST /api/ai/generate-exam`

## Production Note

배포 환경에서 `CBT 생성하기`가 실패하면서 `unexpected end of json input`이 보였다면, 대개 원인은 다음 중 하나입니다.

- `/api`가 배포되지 않음
- `VITE_API_BASE_URL`이 잘못된 주소를 가리킴
- 배포 서버가 JSON 대신 HTML 오류 페이지를 반환함

현재 프런트엔드는 이런 경우 더 구체적인 오류 메시지를 표시하도록 수정되어 있습니다.
