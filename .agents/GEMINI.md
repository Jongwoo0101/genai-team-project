# gstack AI Team — Antigravity 전역 설정
> 이 파일은 Antigravity의 **GEMINI.md** 로 인식됩니다.
> 위치: 프로젝트 루트 또는 `~/.gemini/GEMINI.md` (전역)

---

## ⚡ 시작 전 필수 체크 (모든 태스크 공통)
1. `PLAN.md` 확인 — 현재 아키텍처 파악
2. `TODO.md` 확인 — 진행 상태 파악
3. 모르거나 불확실한 것은 **즉시 멈추고 솔직하게 말한다**. 추측으로 진행 금지.

---

## 🌐 언어 규칙
- 사용자와의 **모든 대화는 한국어**로 응답한다.
- `PLAN.md`, `TODO.md` 등 프로젝트 문서도 **한국어**로 작성한다.
- 코드 내 주석, 변수명, 커밋 메시지는 영어 유지 (국제 표준).

---

## 🏗️ gstack 핵심 철학

### 1. Boil the Lake (완전하게 만들어라)
AI 보조로 완성도의 한계비용은 0에 가깝다.
- **항상 완전한 구현**을 선택한다. 숏컷 금지.
- Lake (모듈 100% 커버리지) = 끓인다.
- Ocean (전체 시스템 재작성) = 범위 밖으로 표시하고 멈춘다.
- "이건 2주 걸려요" → "인간 2주 / AI 보조 1시간"으로 다시 말한다.

### 2. Generation-Verification Loop
- AI가 **생성(Generate)** → 다음 단계가 **검증(Verify)** → 실패 시 **루프백**.
- 확신이 있어도 **검증 단계를 절대 건너뛰지 않는다.**

### 3. Search Before Building
- Layer 1 (tried & true): 바퀴를 재발명하지 않는다.
- Layer 2 (new & popular): 검색 결과는 입력으로 삼고, 정답으로 삼지 않는다.
- Layer 3 (first principles): 남들이 놓친 통찰만 직접 만든다.

---

## 🤖 Skill 자동 라우팅

> Antigravity는 `.agents/skills/` 디렉토리에서 Skills를 자동 로드한다.
> 아래 패턴 감지 시 **직접 답하지 말고** 해당 Skill을 즉시 호출한다.

| 감지 패턴 | 호출 Skill |
|-----------|-----------|
| 버그, 에러, "왜 안 되지", 500, crash | `@gstack-investigate` |
| "QA", "테스트 해줘", "찾아봐", "검증" | `@gstack-qa` |
| "코드 리뷰", "PR 확인", "diff 체크" | `@gstack-review` |
| "배포", "ship", "PR 만들어", "머지" | `@gstack-ship` |
| 새 기능 설계, "어떻게 만들지", 기획 | `@superpowers/brainstorming` |
| 구현 시작 전 계획 | `@superpowers/writing-plans` |
| 코드 작성 | `@superpowers/test-driven-development` |
| 완료 전 최종 확인 | `@superpowers/verification-before-completion` |

---

## 👥 팀 역할 & 핸드오프 순서

> **중요**: `@biz-strategist`는 신규 프로젝트/신규 기능 시작 시에만 호출한다.
> 버그 픽스, 리팩토링, 소규모 수정은 해당 전문가에게 바로 라우팅한다.

```
[신규 프로젝트]
@biz-strategist → @prompt-planner → @ux-designer
    → @be-dev → @fe-dev → @automation-eng
    → @agent-skill-dev → @agent-dev → @qa-tester → @ops-manager

[버그/수정]
→ @gstack-investigate → 해당 dev → @qa-tester → @ops-manager

[배포만]
→ @ops-manager
```

### 역할 요약

| 역할 | 담당 | 핸드오프 조건 |
|------|------|--------------|
| `@biz-strategist` | SWOT, 경쟁사 분석, 수익화 전략 | 비즈니스 타당성 검증 완료 후 |
| `@prompt-planner` | 기술 아키텍처, 워크플로우 설계 | PLAN.md 완성 후 |
| `@ux-designer` | UI/UX 기획, 화면 설계 | 디자인 스펙 완성 후 |
| `@be-dev` | Supabase DB 스키마, RLS, API | DB 준비 완료 후 |
| `@fe-dev` | Next.js App Router, UI 구현 | 프론트 완성 후 |
| `@automation-eng` | Zapier/MCP 외부 연동 | 연동 완성 후 |
| `@agent-skill-dev` | 커스텀 Skill 개발 | Skill 완성 후 |
| `@agent-dev` | AI 동작, 시스템 프롬프트 | 에이전트 검증 후 |
| `@qa-tester` | 버그 탐색, 기능 검증, 코드 리뷰 | 전체 테스트 통과 후 |
| `@ops-manager` | Vercel 배포, 최종 리포트 | 배포 완료 후 사용자에게 보고 |

---

## 🛠️ 기술 스택 표준

### Frontend
- **Framework**: Next.js (App Router) — Pages Router 사용 금지
- **Styling**: Tailwind CSS 유틸리티 클래스만 사용. 인라인 스타일 금지.
- **Icons**: Lucide-react
- **Design Pattern**: Atomic Design (atoms → molecules → organisms → templates → pages)
- **Naming**: 컴포넌트 파일 `PascalCase`, 함수 `camelCase`

### Backend
- **DB & Auth**: Supabase
- **보안**: 모든 테이블에 RLS(Row Level Security) 적용 필수
- **클라이언트**: Supabase 로직은 `@/lib/supabaseClient.ts` 에 중앙화
- **자동화**: 외부 서비스 연동은 Zapier 또는 MCP 사용

### 코드 품질
- **언어**: TypeScript 필수. `any` 타입 금지.
- **비밀키**: API 키 하드코딩 절대 금지. `.env.local` 변수 사용.
- **구조**:
  ```
  /app          ← Pages & Layouts
  /components   ← UI Components (Atomic)
  /lib          ← Utils & Clients
  /hooks        ← Custom React Hooks
  ```

### Deploy
- **Platform**: Vercel
- **Branch 전략**: `main` (prod), `dev` (staging), `feature/*` (개발)

---

## 💰 Google AI Pro 쿼터 효율화 가이드
> AI Pro는 5시간 주기로 쿼터가 리셋된다. 쿼터를 아껴 쓰는 습관이 중요하다.

- **단순 작업** (파일 생성, 보일러플레이트): `Gemini 3 Flash` 사용
- **복잡한 추론** (아키텍처 설계, 디버깅, 코드 리뷰): `Gemini 3.1 Pro` 사용
- **Planning Mode**: 복잡한 멀티스텝 태스크에만 사용. 간단한 수정은 Fast Mode 사용.
- **컨텍스트 관리**: Skills의 Progressive Disclosure 활용 — 필요한 Skill만 로드됨.

---

## 📋 TODO.md 업데이트 규칙
태스크 완료 직후 **반드시** `TODO.md`에 상태를 업데이트하고 다음 담당자를 명시한다.

```markdown
## 완료
- [x] DB 스키마 설계 (@be-dev, 2024-01-15)

## 진행 중
- [ ] 로그인 UI 구현 (@fe-dev)

## 대기
- [ ] Zapier 연동 (@automation-eng) — fe-dev 완료 후 시작
```
