# 스마트 자리비움 및 출퇴근 관리 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 재택근무자를 위한 수동 자리비움(사유 선택 모달 포함), 점심시간 자동 비활성화 로직, 15분 초과 복귀 알림, 그리고 출퇴근 관리 기능을 프론트엔드(React + Zustand)에 구현하고 관리자 대시보드와 데이터를 연동합니다.

**Architecture:** 백엔드 수정 없이 프론트엔드 단독으로 기능을 시뮬레이션 및 구현하기 위해, Zustand Persist 미들웨어를 사용하여 `localStorage`에 출퇴근 및 자리비움 로그 데이터를 관리합니다. 직원 화면과 관리자 화면이 동일한 로컬 데이터 소스를 공유하여 실시간으로 연동되는 것처럼 구성합니다.

**Tech Stack:** React, Zustand (with persist), Tailwind CSS, Lucide Icons

---

## Proposed Changes

### [Frontend]

#### [NEW] [commuteStore.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/store/commuteStore.ts)
- 출퇴근 상태(`NONE` | `WORK` | `LEAVE`), 출근 시각, 퇴근 시각 및 출퇴근 기록 로그 관리
- `localStorage`에 자동 저장(Zustand Persist)

#### [NEW] [awayStore.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/store/awayStore.ts)
- 자리비움 상태(`isAway`), 자리비움 사유(`화장실` | `수분 섭취` | `단순 휴식` | `기타`), 시작 시각 및 자리비움 이력 로그 관리
- `localStorage`에 자동 저장(Zustand Persist)

#### [MODIFY] [EmployeeView.tsx](file:///Users/woojin/Developer/genai-team-project/frontend/src/pages/EmployeeView.tsx)
- 출근/퇴근 버튼 추가 (AI 모니터링은 출근 상태인 `WORK` 상태에서만 활성화 가능하도록 제한)
- `[잠시 자리비움]` / `[복귀]` 버튼 추가
- 자리비움 시 사유 선택 모달(화장실, 수분 섭취, 단순 휴식, 기타) 연동
- 점심시간 자동 비활성화 로직 적용 (12:00 ~ 13:00 사이에는 자리비움 버튼 비활성화 및 안내 문구 노출)
- 15분 경과 체크 타이머 및 초과 시 브라우저 복귀 알림(Notification API 또는 UI 알럿 모달) 노출

#### [MODIFY] [ManagerDashboard.tsx](file:///Users/woojin/Developer/genai-team-project/frontend/src/pages/ManagerDashboard.tsx)
- 로컬 스토리지에 기록된 직원들의 출퇴근 기록 및 자리비움 이력 정보를 불러와 렌더링
- "어제 퇴근 시간 조회" 섹션 추가하여, 현재 날짜 기준 이전 날짜들의 직원별 퇴근 내역을 조회할 수 있도록 함
- 실시간 출근 및 자리비움 통계 현황판 연동 (Mock 통계와 합산하여 렌더링)

---

## Detailed Task Breakdown

### Task 1: 출퇴근(Commute) 및 자리비움(Away) Zustand 스토어 작성

**Files:**
- [NEW] [commuteStore.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/store/commuteStore.ts)
- [NEW] [awayStore.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/store/awayStore.ts)

- **Step 1: commuteStore.ts 코드 작성**
  - 출근(`checkIn`) 및 퇴근(`checkOut`) 시 로그 객체를 생성하여 배열에 누적하고, 브라우저 스토리지에 저장합니다.
- **Step 2: awayStore.ts 코드 작성**
  - `startAway(reason)` 호출 시 상태를 자리비움으로 변경하고, `stopAway()` 호출 시 시작 시점과의 밀리초(ms) 차이를 계산해 분(minute) 단위 소요 시간을 로그에 기록합니다.

### Task 2: 직원 화면(EmployeeView) UI 및 스마트 제어 기능 구현

**Files:**
- [MODIFY] [EmployeeView.tsx](file:///Users/woojin/Developer/genai-team-project/frontend/src/pages/EmployeeView.tsx)

- **Step 1: 출퇴근 카드 추가 및 가드**
  - 상단에 출근/퇴근 카드 영역을 렌더링하고, 출근하지 않았을 때는 AI 모니터링 토글 버튼을 비활성화합니다.
- **Step 2: 수동 자리비움 버튼 및 사유 선택 모달**
  - `[잠시 자리비움]` 버튼을 두어 클릭 시 `화장실`, `수분 섭취`, `단순 휴식`, `기타` 라디오 버튼이 있는 모달창을 띄우고, 확인 시 `startAway`를 시작합니다.
  - 자리비움 상태일 때는 `[복귀]` 버튼으로 토글하며, 복귀 버튼 클릭 시 `stopAway`를 호출합니다.
- **Step 3: 점심시간 및 15분 경고 타이머 로직**
  - 컴포넌트가 로드되거나 매초 갱신 시 현재 시간이 12:00 ~ 13:00 사이인지 체크하여 자리비움 기능 작동을 차단합니다.
  - 자리비움 상태에 돌입하면 타이머를 가동하여 15분이 경과했을 때 `"현재 자리비움 중입니다. 업무에 복귀하셨다면 해제 버튼을 눌러주세요."` 모달 또는 알림창을 표시합니다.

### Task 3: 관리자 대시보드(ManagerDashboard) 어제 퇴근 시간 조회 구현

**Files:**
- [MODIFY] [ManagerDashboard.tsx](file:///Users/woojin/Developer/genai-team-project/frontend/src/pages/ManagerDashboard.tsx)

- **Step 1: 스토어 로그 연동**
  - `useCommuteStore`와 `useAwayStore`를 가져와 등록된 로그 이력을 대시보드 내의 현황판 수치와 연동합니다.
- **Step 2: 어제 퇴근 정보 리스트 UI 추가**
  - 대시보드 하단에 "직원 전일자 출퇴근 기록 조회" 테이블을 추가하여, `dateStr`이 전일자(또는 어제 날짜)에 해당하는 로그 목록을 조회할 수 있도록 구성합니다.

---

## Verification Plan

### Automated Tests
- 없음 (프론트엔드 UI/UX 중심 기능이므로 수동 검증 진행)

### Manual Verification
1. **출퇴근 흐름 테스트**: 
   - `test1` 계정(직원)으로 로그인한 뒤, `[출근]` 버튼을 누르면 출근 시각이 상태 창에 기록되는지 확인합니다.
   - `[퇴근]` 버튼을 누르면 퇴근 시각이 반영되며 모니터링 버튼 등이 비활성화되는지 확인합니다.
2. **수동 자리비움 및 사유 팝업**:
   - `출근` 상태에서 `[잠시 자리비움]` 클릭 시 모달창이 나타나는지 테스트합니다.
   - 사유(예: 화장실)를 선택하고 상태가 `AWAY`로 변경되는지 검증합니다.
   - `[복귀]`를 눌렀을 때 정상 복귀되며 로그 목록에 기록되는지 확인합니다.
3. **점심시간 비활성화**:
   - 로컬 컴퓨터의 시간을 12시 30분으로 임시 조정한 후, 버튼이 비활성화되며 점심시간 멘트가 뜨는지 확인합니다.
4. **15분 초과 스마트 알림**:
   - 자리비움 상태에서 시간이 초과되었을 때 화면에 경고 팝업이 노출되는지 확인합니다.
5. **관리자 조회**:
   - `admin`(관리자) 계정으로 로그인한 뒤, 대시보드의 '어제 퇴근 현황' 목록에서 `test1` 직원의 퇴근 기록이 올바르게 나타나는지 확인합니다.
