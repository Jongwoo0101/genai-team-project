# WorkSight AI 버그 해결 타당성 분석 및 실행 계획 (합의본 v1.1)

사용자가 제시한 버그 리포트와 코덱스 5.3의 타당성 분석을 교차 검토하고, Zustand 리렌더링 이슈 등 추가로 발견한 근본 원인들을 보완하여 최종 실행 계획을 제안합니다.

---

## 1) 타당성 분석 & 교차 검증 결과

### A. "미팅룸 안 들어가지는 거만 손댔다" 검증
* **사실 여부**: **참 (일부 초과 수정 있음)**
* 최근 커밋 `9cc00cd`에서 `videoCallStore.ts` 및 `EmployeeViewContent.tsx`의 입장 로직(`handleJoinRoom`)을 중점적으로 수정하였으나, 백엔드의 `SecurityConfig.java`에서 엔드포인트 허용 경로가 함께 추가된 내역이 있습니다. 해당 변경 사항은 안전하게 가져오기 완료되었습니다.

### B. 버그 원인 가설 교차 검증 결과

1. **출근 중복 동기화 (직원1 출근 시 직원2 동시 출근)**
   * **검증 결과**: **타당함 (확정)**
   * `commuteStore.ts`의 `storage` 이벤트 리스너가 사용자 식별자 필터링 없이 스토리지 변경 사항을 그대로 덮어쓰고 있습니다. 이로 인해 동일 PC/브라우저 내 다중 탭 테스트 시 로컬 스토리지를 공유하면서 다른 사용자의 상태가 전파되는 현상이 100% 재현됩니다.

2. **데일리 스탠드업 피드 미갱신 및 조회 불가**
   * **코덱스 의견**: 웹소켓 구독 제한(`commuteStatus === 'WORK'`) 또는 스토어 교차 탭 동기화 문제.
   * **추가 발견 핵심 원인**: **Zustand 리렌더링 누수 버그 (치명적)**
     * `ManagerDashboardContent.tsx`와 `EmployeeViewContent.tsx`에서 팀 정보를 가져올 때, Zustand의 반응형 상태를 구독하지 않고 `const team = getTeamById(teamId)` 처럼 스토어의 비반응형 액션 함수를 컴포넌트 본문에서 직접 호출하고 있습니다.
     * 이로 인해 비동기 API(`fetchTeamMembers`) 호출이 완료되어 스토어의 `teams` 상태가 성공적으로 갱신되더라도 **React가 리렌더링되지 않아 `team.members`가 계속 빈 배열로 남아있는 심각한 상태 불일치**가 있었습니다. 그 결과 스탠드업 필터링(`team.members.some(...)`)이 무조건 `false`를 반환해 화면에 나타나지 않았던 것입니다.
   * **웹소켓 중복 파싱 영향**: `parseWsEnvelope`은 중복 호출되더라도 에러 대신 정상 파싱된 객체를 반환하므로 즉시 크래시를 내지는 않으나, 타입 안정성을 위해 호출 부위의 중복 처리를 정리할 필요가 있습니다.

3. **미팅룸 입장/승인/기기 제어/종료 관련**
   * **검증 결과**: **타당함 (확정)**
   * **백엔드 설계 결함**: 호스트가 승인 API(`/api/meetings/{roomId}/requests/{participantId}`)를 호출해야 하지만, 백엔드가 상세 조회 API(`ParticipantInfo`) 및 `JOIN_REQUESTED` 웹소켓 페이로드에 필수 키인 `participantId` (참가 테이블 고유 PK)를 누락하여 프론트가 승인을 보내지 못하고 있었습니다.
   * **미팅 제어 누수**: 비디오 모달 종료 시 호스트 여부와 관계없이 항상 `leaveRoom`만 호출되어 방이 완전히 폭파/종료되지 않았습니다.

---

## 2) 버그별 원인 가설과 수정 전략

### 버그 1. 동일 브라우저 다중 계정 출근 동기화 수정
* **수정 전략**: 
  * `commuteStore.ts` 의 storage listener에 사용자 세션 가드를 탑재합니다.
  ```typescript
  const currentOwnerId = useCommuteStore.getState().ownerEmployeeId;
  if (currentOwnerId !== null && parsed.state.ownerEmployeeId === currentOwnerId) {
    useCommuteStore.setState(parsed.state);
  }
  ```
* **대상 파일**:
  * [commuteStore.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/domains/commute/stores/commuteStore.ts)

### 버그 2. 데일리 스탠드업 조회 불가 및 Zustand 반응형 누수 수정
* **수정 전략**:
  * 컴포넌트 내 비반응형 함수 직접 호출 구조를 **반응형 셀렉터 구조**로 전환하여 비동기 로딩 완료 시 리렌더링이 보장되도록 합니다.
  ```typescript
  // 수정 후 셀렉터 방식
  const team = useTeamStore((s) => teamId ? s.teams.find((t) => t.id === teamId) : undefined);
  ```
  * `standupStore.ts` 와 `videoCallStore.ts` 의 `handleWebsocketEvent` 타입 명세 및 중복 파싱 코드를 정리하여 이벤트 리로드가 매끄럽게 흐르도록 보강합니다.
* **대상 파일**:
  * [ManagerDashboardContent.tsx](file:///Users/woojin/Developer/genai-team-project/frontend/src/pages/ManagerDashboardContent.tsx)
  * [EmployeeViewContent.tsx](file:///Users/woojin/Developer/genai-team-project/frontend/src/pages/EmployeeViewContent.tsx)
  * [standupStore.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/domains/standup/stores/standupStore.ts)

### 버그 3. 미팅룸 입장/요청 승인/제어 및 종료 분기 수정
* **수정 전략**:
  * **백엔드 DTO 및 서비스 수정**:
    * `MeetingRoomDto.ParticipantInfo`에 `Long participantId` 추가 및 서비스 매핑 보완.
    * `JOIN_REQUESTED` 웹소켓 브로드캐스트 전송 시 페이로드 맵에 `"participantId", participant.getId()` 추가.
  * **프론트엔드 연동 보완**:
    * `types.ts` 의 `MeetingParticipantResponse` 에 `participantId` 필드 반영.
    * `VideoCallModal.tsx` 종료 버튼 클릭 시 호스트 여부에 따른 `endRoom` (회의 완전 종료) / `leaveRoom` (퇴장) 분기 처리.
    * `videoCallStore.ts` 에서 `Participant` 생성 시 `id` 타입을 `Number(...)` 로 보장하여 장치 제어(카메라/오디오 토글) 대상 유저 매칭 실패 차단.
* **대상 파일**:
  * [MeetingRoomDto.java](file:///Users/woojin/Developer/genai-team-project/backend/src/main/java/com/worksight/api/dto/MeetingRoomDto.java)
  * [MeetingRoomService.java](file:///Users/woojin/Developer/genai-team-project/backend/src/main/java/com/worksight/api/service/MeetingRoomService.java)
  * [videoCallStore.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/domains/video-call/stores/videoCallStore.ts)
  * [VideoCallModal.tsx](file:///Users/woojin/Developer/genai-team-project/frontend/src/domains/video-call/components/VideoCallModal.tsx)
  * [types.ts](file:///Users/woojin/Developer/genai-team-project/frontend/src/lib/types.ts)

---

## 3) 추가 점검 결과: Zustand Persist의 다중 사용자 로컬스토리지 격리 파괴 버그

Zustand `persist` 미들웨어가 동일한 키(`worksight-commute-storage`, `worksight-standup-storage` 등)를 공유하여 로컬스토리지에 저장하면, 브라우저 탭 간에 다른 사용자로 로그인해도 로컬스토리지가 서로 덮어써집니다.
`ownerMemberId` 가드로 이벤트를 무시하여 일시적으로 메모리 상 오염을 막아도, **탭이 새로고침되거나 다시 마운트될 때** 덮어써진 다른 사용자의 데이터를 복구하게 되며, 결국 컨텍스트 동기화(`syncMemberContext`) 시점에서 데이터가 초기화되어 유실됩니다.

이를 원천 차단하기 위해 `teamStore`와 마찬가지로 **모든 Persist 스토어가 로그인한 사용자별 동적 키(`{baseKey}:{userId}`)를 사용하도록 격리**해야 합니다.

### 해결 전략
1. **사용자 스코프 동적 스토리지 유틸리티 개발**:
   `sessionStorage`의 사용자 세션 정보(`USER_INFO`)를 감지하여, 로그인 상태일 때는 `localStorage` 키에 `:userId`를 접미사로 붙이고, 로그아웃 상태일 때는 기본 키를 반환하는 `StateStorage` 어댑터를 만듭니다.
2. **대상 스토어에 동적 스토리지 설정 주입**:
   `commuteStore.ts`, `standupStore.ts`, `videoCallStore.ts` 의 `persist` 옵션 중 `storage` 필드에 커스텀 스토리지 어댑터를 지정합니다.
3. **탭 동기화(`storage` 이벤트 리스너) 로직 보완**:
   동적 키의 `storage` 이벤트가 들어올 때, 본인 탭의 사용자 ID에 해당하는 키(`{baseKey}:{myUserId}`)의 이벤트만 필터링하여 상태를 동기화하도록 가드를 작성합니다.

---

## 4) 실행 순서 및 검증 계획

### 실행 순서
1. **[NEW] 사용자 스코프 스토리지 유틸리티 구현** (`frontend/src/lib/userScopedStorage.ts`)
2. **[MODIFY] commuteStore, standupStore, videoCallStore 에 동적 스토리지 적용 및 storage 이벤트 리스너 가드 보완**
3. **통합 컴파일 및 빌드 검증**
4. **다중 탭 수동 QA 검증**

### 자동 검증 계획
```bash
# 프론트엔드 빌드 검증
npm run build --prefix frontend
```

### 수동 검증 계획
1. **동일 브라우저 멀티 탭 격리 검증**:
   - 탭 A(관리자1), 탭 B(직원1), 탭 C(직원2)로 각각 로그인.
   - 각 탭에서 출근 상태 변경, 스탠드업 작성, 미팅룸 입장 진행.
   - 각 탭을 개별적으로 새로고침하여 본인의 데이터가 날아가거나 꼬이지 않고 안전하게 복구되는지 검증.
2. **상태 격리 검증**: 탭 A에서 저장된 로컬스토리지 항목 중 `worksight-commute-storage:1`, `worksight-commute-storage:2` 와 같이 사용자 ID별 접미사가 붙은 고유 키로 분리 생성되었는지 브라우저 개발자 도구 Application 탭에서 확인.
