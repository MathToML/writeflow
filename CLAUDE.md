# OTTD (One Thing To Do) — writeflow

## Project Overview
AI 기반 생산성 도구. Brain dump → AI 자동 분류 → "지금 하나만" 추천.
상세 내용은 `PRD.md` 참조.

## Language Instructions
- 한국어로 응답하되, 기술 용어는 English 유지
- 코드 주석은 English

## Tech Stack
- **Frontend**: Next.js (App Router) on Vercel
- **Auth / DB / Storage**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Gemini API (multimodal)
- **Background Jobs**: Inngest (Vercel 연동)
- **Push Notification**: FCM
- **Voice**: Google Speech-to-Text or Whisper API
- **Mobile (Phase 2)**: Flutter

## Code Conventions
- TypeScript strict mode
- App Router (Next.js) — `app/` directory
- Server Components 우선, 필요한 경우만 `"use client"`
- Supabase client: server-side는 `createServerClient`, client-side는 `createBrowserClient`
- Tailwind CSS for styling
- Component 파일명: PascalCase (e.g., `TaskCard.tsx`)
- Utility/hook 파일명: camelCase (e.g., `useTaskRecommendation.ts`)

## Project Structure (Target)
```
writeflow/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth 관련 routes
│   ├── (dashboard)/        # 메인 대시보드
│   ├── api/                # API Routes
│   └── layout.tsx
├── components/             # Shared UI components
├── lib/                    # Utilities, Supabase client, AI helpers
├── inngest/                # Inngest functions (heartbeat, cron)
├── types/                  # TypeScript type definitions
├── public/
├── PRD.md
└── CLAUDE.md
```

## Key Files Reference
- `PRD.md` — 제품 요구사항 문서
- `app/` — Next.js 앱 코드
- `inngest/` — Heartbeat, 스케줄 작업
- `lib/supabase/` — Supabase 클라이언트 설정
- `lib/ai/` — Gemini API 연동

## Important Notes
- 이 프로젝트는 다중 사용자(multi-tenant) 앱
- Supabase RLS 항상 적용 — 사용자 본인 데이터만 접근 가능하도록
- 보안 최우선: OWASP Top 10 주의
- "One Thing" 추천이 핵심 UX — 사용자를 overwhelm하지 않는 것이 원칙
