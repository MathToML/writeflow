# PRD: One Thing To Do (OTTD)

> **Project Name**: writeflow
> **Product Name**: One Thing To Do (OTTD) — 가제
> **Version**: 0.1 (Draft)
> **Last Updated**: 2026-02-06

---

## 1. 제품 비전

### 핵심 철학

> 사람은 일 자체의 어려움보다 **일의 갯수에 질린다.**
> 할 일이 너무 많으면 overwhelm 되어 일 자체를 시작하지 못한다.

OTTD는 사용자의 모든 것을 기록하고 정리하되, **지금 딱 하나만** 추천하여 사용자가 부담 없이 일을 시작하고, 성취감을 쌓아가게 하는 AI 기반 생산성 도구이다.

### 핵심 가치

- **Brain Dump 수용**: 무엇이든, 어떤 형태든 던지면 AI가 알아서 분류하고 정리
- **One Thing Focus**: 아무리 할 일이 많아도 지금 할 수 있는 **단 하나만** highlight
- **Proactive Nudge**: 사용자가 묻지 않아도 적절한 타이밍에 부드럽게 일을 제안
- **위로와 격려**: 일을 관리하는 것이 아니라 사람을 돕는 것이 목표

---

## 2. 타겟 사용자

- 할 일이 많아서 머릿속이 복잡한 사람
- 기존 todo 앱에 일을 정리하는 것 자체가 부담인 사람
- 일정, 할 일, 메모, 연락처 등이 여러 앱에 흩어져 있는 사람
- 처음부터 **다중 사용자** 지원 (multi-tenant)

---

## 3. 입력 방식

사용자는 다음 형태로 자유롭게 brain dump 한다:

| 입력 형태 | 처리 방식 |
|-----------|-----------|
| **텍스트** | 직접 분석 |
| **음성** | Speech-to-Text 변환 후 분석 |
| **사진 / 스크린샷** | Gemini multimodal 분석 (OCR, 내용 파악) |

모든 입력에는 **시간**, **장소** (가능한 경우), **원본 내용**이 자동으로 기록된다.

---

## 4. 핵심 기능

### 4.1 AI 자동 분류

사용자가 무언가를 던지면 AI가 다음을 판단한다:

- 이것이 **일정**인가, **할 일**인가, **기록**인가, **기존 항목의 업데이트**인가?
- 기록이라면 어떤 타입인가? (**지출**, **연락처**, **건강**, **절차**, **참조**, **일반**)
- 습관 기록인가? (기존 습관과 매칭 또는 새 습관 등록 제안)
- 중요한 일인가, 단순 기록인가?
- 기존에 관련된 항목이 있는가?

분류 후 적절한 카테고리에 자동 저장한다. 특히 이미지 입력(영수증, 명함 등)은 Gemini multimodal로 내용을 추출하여 구조화된 데이터로 변환한다.

### 4.2 일정 (Calendar)

- **일정 생성**: "내일 오후 3시 치과" → 자동으로 일정 생성
- **일정 취소/변경**: "치과 취소됐어" → 해당 일정 찾아서 취소 처리
- **세부 정보 추가**: 참석자, 장소, 컨텍스트, 관련 메모
- Google Calendar 양방향 동기화 (향후)

### 4.3 할 일 (Tasks)

각 할 일에는 다음 속성이 포함된다:

| 속성 | 설명 |
|------|------|
| **내용** | 할 일의 구체적 내용 |
| **중요도** | AI가 판단 + 사용자 조정 가능 |
| **성격/컨텍스트** | 장소 의존 (우편 부치기), 책상 작업, 커뮤니케이션 (보내고 기다리기) 등 |
| **Due Date** | 마감일 (있는 경우) |
| **관련 인물** | 이 일에 관계된 사람들 |
| **상태** | 대기 / 진행 중 / 완료 / 보류 |

**대형 할 일 → Issue Tracker**:
- 덩어리가 큰 일은 자동으로 ticket/issue 형태로 전환
- Jira 스타일 또는 Kanban 인터페이스로 진행 상황 추적
- 하위 작업(sub-task)으로 분할 가능

### 4.4 습관 추적 (Habit Tracker)

**대화형 습관 등록 흐름:**

1. 사용자: "나 오늘 달리기 30분 했어"
2. AI: "좋은 시작이네요! 🏃 이거 한번 습관으로 만들어볼까요?"
3. 사용자: "응 좋아"
4. AI: 습관 등록 + 오늘 기록 자동 완료

이후 "오늘도 달리기 했어" → 기존 습관에 자동 매칭하여 기록 추가.

**핵심 기능:**

- 반복적인 활동 추적: 찬물샤워, 뽀모도로 공부 횟수, 성경 읽기, 운동 등
- 각 항목에 **간단한 기록** 가능 (예: "마태복음 1장 읽음", "5km 달림")
- **GitHub 스타일 Heatmap**으로 꾸준함 시각화
  - 하루에 여러 번 기록 시 색이 진해짐 (count 기반 intensity)
  - 각 셀 클릭 시 해당 날짜의 세부 기록 표시
- Streak 카운터 및 격려 메시지
- AI가 습관 달성률 기반으로 추천에 반영 ("오늘 아직 운동 안 하셨네요, 가벼운 산책 어때요?")

### 4.5 기록 (Records) — 다양한 생활 기록

사용자의 모든 기록을 AI가 **자동으로 타입을 판별**하여 적절한 구조로 저장한다.

#### 기록 타입

| 타입 | 입력 예시 | 자동 처리 | 저장 구조 |
|------|----------|----------|----------|
| **expense** | 영수증 사진, "점심 15000원" | 금액·날짜·카테고리 자동 추출 | `{amount, currency, category, vendor, date, media_url}` |
| **contact** | "김부장 010-1234-5678" | 이름·연락처 파싱 | `{name, phone, email, company, relation}` |
| **procedure** | "서버 배포 방법: 먼저..." | 단계별 구조화 | `{steps[], tags}` |
| **health** | "혈압 120/80" | 수치 파싱 | `{metric, value, unit, date}` |
| **reference** | "가족 생일: 엄마 3/15" | 참조 정보 저장 | `{description, related_date}` |
| **general** | 기타 모든 기록 | 텍스트 보존 | `{description}` |

#### 지출 기록 (Expense) 상세

영수증 사진 → Gemini multimodal 분석:

1. 이미지에서 **금액, 날짜, 가맹점, 품목** 자동 추출
2. 카테고리 자동 분류 (식비, 교통, 쇼핑, 의료, 문화, 기타)
3. 원본 이미지는 증빙 자료로 보관 (Supabase Storage)
4. 텍스트 입력도 가능: "점심 김밥 8000원" → 파싱 후 동일 구조로 저장

UI:
- 지출 내역 리스트 (날짜별)
- 카테고리별 파이차트
- 월별 요약

#### 기록 접근 — 2-Tier Memory

- **최근 기록 (Hot)**: 최근 30일 기록은 Supabase에서 직접 조회, 대시보드에서 빠르게 접근
- **과거 기록 (Cold)**: 30일 이전 기록은 RAG 시스템으로 이동, 대화를 통해 검색
  - "작년에 치과 갔을 때 얼마였지?" → RAG에서 관련 기록 탐색
  - Google Vertex AI File Search 활용

#### 기존 참조 정보

일을 수행하기 위한 참조 정보도 record로 저장:

- 고객 주소, 연락처
- 특정 작업 수행 방법 (절차, 매뉴얼)
- 가족의 생일, 중요한 행사
- 장볼 것 목록
- 고객의 가족관계, 배경 정보
- 기타 working memory로서의 모든 기록

### 4.6 Daily Memory Dump (Raw Data)

- 하루 동안의 모든 brain dump를 **시간순으로 기록**
- 당일 데이터는 "오늘" 섹션에 표시
- 하루가 지나면 **날짜별로 History 섹션에 아카이브**
- AI가 하루 요약을 자동 생성
- 검색 및 참조 가능

---

## 5. "One Thing" 메인 화면

앱을 열면 보이는 메인 화면:

```
┌─────────────────────────────┐
│  2026년 2월 6일 금요일        │
│  오후 2:30                   │
│                              │
│  ┌─ 오늘의 일정 (간략) ─────┐ │
│  │ 10:00 팀 미팅 ✓          │ │
│  │ 15:00 치과               │ │
│  │ 19:00 저녁 약속          │ │
│  └──────────────────────────┘ │
│                              │
│  ┌─ 지금 이것 하나만 ──────┐ │
│  │                          │ │
│  │  🎯 치과 가기 전에       │ │
│  │     우편물 부치기         │ │
│  │                          │ │
│  │  "밖에 나가는 김에        │ │
│  │   같이 하면 딱이에요"     │ │
│  │                          │ │
│  │  [완료] [나중에] [건너뛰기]│ │
│  └──────────────────────────┘ │
│                              │
│  나머지 5개 할 일 ▸ (접힘)   │
│                              │
└─────────────────────────────┘
```

**핵심 UX 원칙:**
- 추천된 하나는 **크고 선명하게**
- 나머지는 **회색/접힘 처리** 또는 아예 숨김
- 완료 시 **성취감 피드백** (micro-interaction, 격려 메시지)
- "오늘 3개 해냈어요!" 같은 progressive achievement 표시

**추천 로직:**
- 시간대, 장소, 에너지 레벨 추론
- Due date 긴급성
- 할 일의 성격 (밖에 있으면 장소 의존 작업 추천, 책상 앞이면 집중 작업 추천)
- 커뮤니케이션 작업은 우선 (보내고 기다리는 시간 확보)

---

## 6. Proactive 시스템

### 6.1 Heartbeat

일정 간격(기본 15분)으로 사용자 상태를 분석:

- 현재 시간과 일정 확인
- 최근 활동 패턴 분석 (일을 하고 있는지, 쉬고 있는지)
- 장소 정보 활용 (가능한 경우)
- 에너지 레벨 추론 (시간대, 완료한 일의 양과 무게)

### 6.2 Smart Nudge

Heartbeat 분석 결과에 따라 적절한 알림 발송:

| 상황 | Nudge 예시 |
|------|-----------|
| 일정 근처 | "30분 후 치과 예약이 있어요" |
| 밖에 나온 상태 | "근처에 있는 김에 우편 부치는 건 어때요?" |
| 오래 쉬고 있을 때 | "가벼운 거 하나 해볼까요? 5분이면 돼요" |
| 지쳐 보일 때 | "오늘 이미 3개나 했어요. 쉬어도 괜찮아요 😊" |
| 커뮤니케이션 대기 | "어제 보낸 메일, 답변 왔는지 확인해볼까요?" |

**Nudge 원칙:**
- 절대 재촉하지 않는다. **제안**한다.
- 사용자가 **"지금은 아니야"** 할 수 있어야 한다 (Snooze)
- Snooze 패턴도 학습하여 nudge 빈도와 시간을 조절
- 하루 nudge 횟수 상한선 설정 (알림 피로 방지)

---

## 7. 사용자 페르소나 시스템

### 자동 프로필 구축

- **초기**: 소셜 로그인 또는 가입 시 이름 확보 (최소한의 통성명)
- **점진적**: 대화와 입력에서 정보를 자연스럽게 수집
  - 성별, 나이, 직업
  - 가족관계, 가족 이름
  - 생활 패턴, 출퇴근 시간
  - 선호하는 작업 시간대
  - 자주 가는 장소
- **필요 시**: AI가 자연스럽게 질문 ("혹시 이분이 가족이세요?")
- 모든 페르소나 정보는 별도 저장, 지속적 업데이트

### Onboarding

첫 시작 시 가벼운 AI 대화:
- "안녕하세요! 이름이 어떻게 되세요?" (소셜 로그인이면 생략)
- "주로 어떤 일을 하세요?"
- "하루 중 가장 집중이 잘 되는 시간대가 있으세요?"
- 최소한만 물어보고, 나머지는 사용하면서 자연스럽게 파악

---

## 8. Memory 시스템

### 구조 — 2-Tier Memory Architecture

```
Memory
├── Hot Layer (직접 접근 — Supabase)
│   ├── 오늘의 brain dump, 진행 중인 작업
│   ├── 최근 30일 기록 (records, expenses, habit logs)
│   ├── 활성 할 일, 일정
│   └── Persona (사용자 프로필, 선호도, 패턴)
│
├── Cold Layer (RAG 검색 — Vertex AI File Search)
│   ├── 30일 이전 기록 (요약 + 원본)
│   ├── 완료된 할 일, 과거 일정
│   ├── 날짜별 daily dump 히스토리
│   └── 아카이브된 습관 데이터
│
└── Sync Process (Inngest Cron)
    ├── 매일 30일 이전 기록을 Cold Layer로 export
    ├── 요약 생성 후 File Search vector store에 upsert
    └── Hot Layer에서 원본 삭제는 하지 않음 (Supabase에 보존, UI에서 Cold로 전환)
```

### Hot → Cold 전환 흐름

1. Inngest cron job이 매일 실행
2. 30일 이전 기록을 JSON + 요약 텍스트로 변환
3. Google Vertex AI File Search (또는 Gemini File API)에 업로드
4. Supabase의 해당 기록에 `archived: true` 마킹
5. 대시보드에서는 archived 기록 미표시, 대화에서 "작년에..." 질문 시 RAG로 탐색

### 참고 시스템

- **OpenClaw Memory System**: 적절한 요약 + seamless 압축으로 unlimited memory 경험 제공
- **Heartbeat Cron System**: 사용자 요청 없이도 주기적으로 분석 및 행동
- **Supermemory**: Raw data + RAG 결합
- **Gemini Long Context** (1M+ tokens): 초기에는 사용자 데이터를 통째로 context에 넣어 분석
- **Vertex AI RAG Engine / File Search**: 데이터가 대량으로 쌓이면 Cold Layer로 전환

### Memory 운영 원칙

- 새로운 입력은 항상 raw 형태로 보존
- AI가 주기적으로 요약 및 압축 (원본은 유지)
- 관련 정보끼리 자동 연결 (linking)
- 검색 시 Hot Layer 직접 조회 → 없으면 Cold Layer semantic search로 탐색
- 사용자는 tier 구분을 인식하지 못함 — "그냥 기억해줘"

---

## 9. 기술 스택

### Architecture Overview

```
┌──────────────────────────────────────────────┐
│                  Client                       │
│         Next.js (Vercel) — MVP                │
│         Flutter — Mobile (Phase 2)            │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│              API Layer                        │
│      Next.js API Routes / Server Actions      │
│              (Vercel)                          │
└──────┬───────┬───────┬───────┬───────────────┘
       │       │       │       │
┌──────▼──┐ ┌──▼───┐ ┌─▼────┐ ┌▼──────────────┐
│Supabase │ │Gemini│ │ FCM  │ │   Inngest     │
│         │ │ API  │ │      │ │               │
│• Auth   │ │      │ │Push  │ │• Heartbeat    │
│• PgSQL  │ │• 분류 │ │Notif │ │• Scheduled    │
│• Storage│ │• 추천 │ │      │ │  Jobs         │
│• REST   │ │• 분석 │ │      │ │• Per-user     │
│         │ │• Multi│ │      │ │  Scheduling   │
│         │ │  modal│ │      │ │               │
└─────────┘ └──────┘ └──────┘ └───────────────┘
```

### 스택 상세

| 역할 | 서비스 | 선택 이유 |
|------|--------|-----------|
| **Frontend (MVP)** | Next.js on Vercel | 빠른 개발, API Routes 통합, 프론트+백 한 곳 |
| **Frontend (Mobile)** | Flutter | iOS/Android 동시 배포, 네이티브 push |
| **Auth** | Supabase Auth | Google/Apple 소셜 로그인, RLS 연동 |
| **Database** | Supabase PostgreSQL | SQL 자유, 복합 query, 인덱스 유연성 |
| **Storage** | Supabase Storage | 사진, 음성 파일 저장 |
| **API** | Next.js API Routes + Supabase auto-generated REST | cold start 없음, 프론트와 같은 코드베이스 |
| **Background Jobs** | Inngest (Vercel 연동) | Heartbeat, per-user 스케줄링, 자동 retry |
| **Push Notification** | FCM | API route에서 직접 호출, 업계 표준 |
| **AI** | Gemini API | Multimodal (텍스트+이미지+음성), long context, 비용 효율 |
| **Voice** | Google Speech-to-Text 또는 Whisper API | 음성 입력 transcription |
| **Semantic Search** | Gemini long context → Vertex AI RAG Engine (스케일 시) | 초기엔 context window로 충분, 이후 확장 |

### 인프라 비용 (MVP 단계)

| 서비스 | 비용 |
|--------|------|
| Vercel | Free (Hobby) → $20/mo (Pro) |
| Supabase | Free → $25/mo (Pro) |
| Inngest | Free (25K events) → $25/mo |
| Gemini API | 종량제 (저용량 시 거의 무료) |
| FCM | 무료 |
| **합계 (개발 단계)** | **$0** |
| **합계 (런칭 후)** | **~$45~70/mo** |

---

## 10. 데이터 모델 (주요 테이블)

```sql
-- 사용자
users
├── id, email, name
├── persona (jsonb) -- 점진적으로 쌓이는 프로필
├── preferences (jsonb) -- nudge 빈도, 집중 시간대 등
└── created_at, updated_at

-- Brain Dump (원본 데이터)
dumps
├── id, user_id
├── type (text | voice | image)
├── raw_content -- 원본 텍스트 또는 파일 URL
├── transcript -- 음성인 경우 변환된 텍스트
├── ai_analysis (jsonb) -- AI 분류 결과
├── location (point) -- 위치 정보 (선택)
└── created_at

-- 일정
events
├── id, user_id, dump_id (원본 연결)
├── title, description
├── start_at, end_at
├── location, attendees (jsonb)
├── status (active | cancelled | completed)
├── context (jsonb) -- 관련 메모, 배경 정보
└── created_at, updated_at

-- 할 일
tasks
├── id, user_id, dump_id
├── title, description
├── importance (1-5) -- AI 판단 + 사용자 조정
├── context_type (location_dependent | desk_work | communication | errand | ...)
├── due_date
├── related_people (jsonb)
├── status (pending | in_progress | done | deferred)
├── parent_task_id -- 대형 할 일의 sub-task 연결
├── is_ticket (boolean) -- issue tracker 표시 여부
└── created_at, updated_at

-- 습관
habits
├── id, user_id
├── name -- "찬물샤워", "성경읽기" 등
├── description
└── created_at

-- 습관 기록
habit_logs
├── id, habit_id, user_id
├── logged_date
├── note -- "마태복음 1장 읽음"
├── count -- 뽀모도로 횟수 등
└── created_at

-- 기록 (다양한 생활 기록)
records
├── id, user_id, dump_id
├── category (expense | contact | procedure | health | reference | general | ...)
├── title, content (jsonb) -- 카테고리별 다형 구조 (아래 참조)
├── tags (text[])
├── occurred_at -- 기록이 발생한 실제 날짜 (영수증 날짜 등)
├── media_urls (text[]) -- 증빙 이미지들
├── archived (boolean) -- Cold Layer로 전환 시 true
└── created_at, updated_at

-- records.content 카테고리별 구조:
-- expense:   {amount, currency, category, vendor, items[], payment_method}
-- contact:   {name, phone, email, company, relation, address}
-- procedure: {steps[], source}
-- health:    {metric, value, unit}
-- reference: {description, related_date}
-- general:   {description}

-- Daily Summary
daily_summaries
├── id, user_id
├── date
├── summary_text -- AI 생성 하루 요약
├── stats (jsonb) -- 완료 수, 습관 달성 등
└── created_at

-- Nudge 기록
nudge_logs
├── id, user_id
├── type (schedule_reminder | task_suggestion | encouragement | ...)
├── content
├── user_response (accepted | snoozed | dismissed)
├── snoozed_until
└── created_at
```

---

## 11. 개발 단계

### Phase 1: MVP (핵심 가치 검증)

- [ ] 프로젝트 세팅 (Next.js + Supabase + Vercel)
- [ ] 사용자 인증 (Google 소셜 로그인)
- [ ] Brain dump 입력 (텍스트만)
- [ ] AI 자동 분류 (Gemini) — 일정 / 할 일 / 기록 구분
- [ ] 할 일 목록 및 **"One Thing" 추천** 메인 화면
- [ ] 할 일 완료 처리 + 성취감 피드백
- [ ] 오늘의 일정 간략 표시
- [ ] Daily memory dump 기록 및 날짜별 아카이브

### Phase 2: 확장 입력 + 기록 시스템

- [x] 음성 입력 (Speech-to-Text)
- [x] 이미지 입력 (Gemini multimodal 분석)
- [x] 사용자 페르소나 점진적 구축
- [ ] **지출 기록 (Expense)**: 영수증 이미지/텍스트 → 자동 분류·파싱 → 지출 내역 UI
- [ ] **기록 타입 확장**: contact, procedure, health, reference 등 다형 record
- [ ] Records 리스트 UI + 카테고리 필터
- [ ] 최근 기록 대시보드 quick access

### Phase 3: 습관 + Proactive

- [ ] **Habit Tracker**: 대화형 습관 등록 + 기록
- [ ] **GitHub-style Heatmap** 시각화
- [ ] Streak 카운터 + AI 격려 메시지
- [ ] Heartbeat 시스템 (Inngest)
- [ ] Smart Nudge + Push Notification (FCM)
- [ ] Snooze 및 nudge 패턴 학습

### Phase 4: Memory + 고도화

- [ ] **2-Tier Memory**: Cold Layer (Vertex AI File Search / RAG)
- [ ] Hot → Cold 자동 전환 (Inngest cron)
- [ ] 대화 기반 과거 기록 검색 ("작년에 치과 비용이 얼마였지?")
- [ ] Issue Tracker / Kanban 뷰 (대형 할 일)
- [ ] Weekly Review 자동 생성
- [ ] Google Calendar 양방향 동기화

### Phase 5: 모바일

- [ ] Flutter iOS/Android 앱
- [ ] 네이티브 Push Notification
- [ ] 위치 기반 nudge
- [ ] 오프라인 지원 + sync

---

## 12. 성공 지표

| 지표 | 목표 |
|------|------|
| Daily Active Usage | 하루 1회 이상 brain dump |
| Task Completion Rate | 추천된 "One Thing" 완료율 50%+ |
| Nudge Acceptance Rate | nudge 수락률 30%+ |
| Retention | 7일 재방문율 60%+ |
| User Sentiment | "부담 없다", "도움 된다" 피드백 |

---

## 13. 디자인 원칙

- **미려하고 깔끔한 UI**: 동적이되 과하지 않은 애니메이션
- **여백 활용**: 정보 과밀 방지, 숨 쉴 공간
- **따뜻한 톤**: 기계적이지 않은 AI 메시지 (위로, 격려, 유머)
- **원탭 조작**: 핵심 동작은 한 번의 탭으로 완료
- **Dark mode 지원**: 기본 제공

---

## 14. 보안 및 프라이버시

- 매우 민감한 개인 데이터를 다루므로 보안 최우선
- Supabase Row Level Security (RLS) — 사용자 본인 데이터만 접근
- HTTPS 전구간 암호화
- AI API 호출 시 개인 정보 최소화
- 데이터 삭제 요청 시 완전 삭제 (GDPR 준수)
- 향후 end-to-end encryption 검토

---

## 부록: 참고 서비스 및 시스템

| 참고 대상 | 참고 포인트 |
|-----------|------------|
| OpenClaw Memory System | 적절한 요약 + seamless 압축을 통한 unlimited memory 경험 |
| Heartbeat Cron System | 사용자 요청 없이 주기적으로 분석 및 행동하는 구조 |
| Supermemory | Raw data + RAG 결합 |
| Google Vertex AI RAG Engine | 관리형 RAG 시스템 |
| Gemini Long Context | 1M+ tokens context window 활용 |
| GitHub Heatmap | 습관 추적 시각화 참고 |
| Jira / Linear | Issue tracker, Kanban 인터페이스 참고 |
