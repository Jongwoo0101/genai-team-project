# Global Technical Standards & Conventions
> 이 파일은 `.agents/rules/` 에 위치하며 Antigravity가 항상 참조한다.
> (`trigger: always_on` 문법은 Antigravity에서 미지원 — GEMINI.md로 대체됨)

---

## 1. 공통 원칙
- **응답 언어**: 사용자와의 모든 대화는 **한국어**로 한다.
- **문서**: `PLAN.md`, `TODO.md` 등 모든 프로젝트 문서는 **한국어**로 작성한다.
- **시작 전 확인**: 모든 태스크 시작 전 `GEMINI.md` → `PLAN.md` → `TODO.md` 순서로 읽는다.
- **모르면 멈춘다**: 불확실한 경우 추측으로 진행하지 말고 솔직하게 말하고 멈춘다.

---

## 2. Frontend 표준 (React.js + Vite & Tailwind)
- **Framework**: Next.js App Router (Pages Router 사용 금지)
- **Styling**: Tailwind CSS 유틸리티 클래스만 사용. 인라인 스타일 절대 금지.
- **Icons**: Lucide-react
- **Pattern**: Atomic Design
- **Naming**: 컴포넌트 `PascalCase`, 함수 `camelCase`

---

## 3. Backend & Integration 표준 (Spring Boot & Zapier)
- **DB & Auth**: Supabase
- **보안**: 모든 테이블에 RLS 적용 필수
- **API**: Supabase 로직은 `@/lib/supabaseClient.ts` 에 집중
- **자동화**: 외부 서비스 연동은 Zapier 또는 MCP
- **비밀키**: 절대 하드코딩 금지. `.env.local` 사용.

---

## 4. 코드 품질 표준
- **TypeScript 필수**: `any` 타입 사용 금지
- **디렉토리 구조**:
  - `/app` — Pages & Layouts
  - `/components` — UI (Atomic Design)
  - `/lib` — Utils & Clients
  - `/hooks` — Custom React Hooks
- **검증**: 모든 기능은 `@qa-tester` 검토 후 `@ops-manager` 에게 넘긴다.

---

## 5. 핸드오프 규칙
- 태스크 완료 시 반드시 `TODO.md` 업데이트 후 다음 담당자를 명시한다.
- 예시: `"@ux-designer, 플랜 기반으로 UI 설계를 시작해주세요."`

---

## 6. 비즈니스 전략 표준 (신규 프로젝트 한정)
- **분석 프레임워크**: SWOT 분석 + 경쟁사 매트릭스 (최소 3개 경쟁사)
- **고객 분석**: Primary/Secondary 페르소나 명확히 정의
- **수익화**: 최소 2개 수익 모델 제안 (Freemium, Subscription, API 과금 등)
- **결론**: 시장 포화도 + 기술 난이도 기반 Go/No-Go 판정
- **언어**: 전략 보고서는 한국어로 작성

> ⚠️ 이 섹션은 신규 프로젝트 시작 시에만 적용된다.
> 버그 픽스, 리팩토링, 소규모 수정에는 적용하지 않는다.
