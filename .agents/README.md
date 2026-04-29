# gstack Antigravity 설정 구조
> Google Antigravity + Google AI Pro 기준으로 최적화된 AI 팀 세팅

---

## 📁 파일 배치 방법

### 프로젝트별 설정 (workspace scope)
```
<프로젝트 루트>/
├── GEMINI.md                          ← Antigravity 핵심 지시 파일 (여기에 위치)
├── PLAN.md                            ← 아키텍처 문서 (직접 작성)
├── TODO.md                            ← 진행 상태 (직접 작성)
├── GSTACK_ETHOS.md                    ← gstack 철학 참조 문서
│
└── .agents/
    ├── rules/
    │   └── ai-team-standards.md       ← 팀 표준 규칙
    │
    └── skills/
        ├── gstack-investigate/
        │   └── SKILL.md
        ├── gstack-qa/
        │   └── SKILL.md
        ├── gstack-review/
        │   └── SKILL.md
        ├── gstack-ship/
        │   └── SKILL.md
        └── superpowers/
            ├── brainstorming/
            │   └── SKILL.md
            ├── writing-plans/
            │   └── SKILL.md
            ├── test-driven-development/
            │   └── SKILL.md
            ├── verification-before-completion/
            │   └── SKILL.md
            ├── executing-plans/
            │   └── SKILL.md
            └── finishing-a-development-branch/
                └── SKILL.md
```

### 전역 설정 (모든 프로젝트에 적용하려면)
```
~/.gemini/
├── GEMINI.md                          ← 전역 GEMINI.md
└── antigravity/
    └── skills/                        ← 전역 Skills (symlink 권장)
        └── (위 skills/ 폴더 내용 복사 또는 symlink)
```

---

## 🚀 빠른 설치

```bash
# 1. 이 폴더를 프로젝트 루트에 복사
cp GEMINI.md /your-project/
cp GSTACK_ETHOS.md /your-project/
cp -r rules /your-project/.agents/
cp -r skills /your-project/.agents/

# 2. (선택) 전역으로 등록해서 모든 프로젝트에서 사용
mkdir -p ~/.gemini/antigravity/skills
ln -s /your-project/.agents/skills/* ~/.gemini/antigravity/skills/
```

---

## ⚙️ Google AI Pro 쿼터 팁
- **복잡한 작업**: Gemini 3.1 Pro + Planning Mode
- **단순한 작업**: Gemini 3 Flash + Fast Mode
- 쿼터는 5시간마다 리셋 (Pro 기준)
- Skills의 Progressive Disclosure 덕분에 필요한 것만 컨텍스트에 로드됨 → 쿼터 절약

---

## ⚠️ 기존 설정과 달라진 점
| 항목 | 기존 | 변경 후 |
|------|------|---------|
| Skills 위치 | `.agents/skills/` | `.agents/skills/` ✅ (동일, 정확함) |
| Rules 위치 | `rules/` (루트) | `.agents/rules/` (Antigravity 표준) |
| `trigger: always_on` | rules 파일에 있었음 | **제거** (Antigravity 미지원, GEMINI.md로 대체) |
| biz-strategist 강제 | 모든 작업에 적용 | **신규 프로젝트에만** 적용 |
| 충돌 해결 규칙 | 없었음 | GEMINI.md 라우팅 테이블로 명시 |
