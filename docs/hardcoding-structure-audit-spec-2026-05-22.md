# WorkSight 코드 점검 및 개선 명세서
작성일: 2026-05-22
범위: `frontend/src`, `backend/src/main`, `ai_model/src`, `ai_model/server.py`

## 1) 점검 결과 요약
- 하드코딩 이슈와 구조적 리스크가 함께 존재합니다.
- 특히 `보안 하드코딩`(JWT secret), `WebSocket 이벤트 계약 불일치`, `시간 필드 계약 불일치`는 우선 수정이 필요합니다.
- 프론트엔드 주요 페이지가 과도하게 비대하고(UI + 비즈니스 + 통신 로직 혼재) 타입 안정성이 낮아 유지보수 비용이 빠르게 증가하는 구조입니다.

## 2) 주요 발견 사항 (우선순위순)

### [Critical] JWT Secret 저장소 하드코딩
- 증거
  - `backend/src/main/resources/application.yaml:29`
  - `backend/src/main/java/com/worksight/api/security/JwtProvider.java:22`
- 문제
  - 저장소 유출 또는 접근 시 토큰 위조 가능성이 생깁니다.
  - 운영/개발 환경 분리가 어렵습니다.

### [High] AI 서버 전역 SSL 검증 비활성화
- 증거
  - `ai_model/server.py:15`
- 문제
  - TLS 인증서 검증이 꺼져 MITM 위험이 생깁니다.
  - 전역 설정이라 다른 네트워크 요청에도 영향이 퍼집니다.

### [High] WebSocket 이벤트 페이로드 계약 불일치
- 증거 (백엔드 발신)
  - `backend/src/main/java/com/worksight/api/service/MeetingRoomService.java:315`
  - `backend/src/main/java/com/worksight/api/service/DailyStandupService.java:140`
  - `backend/src/main/java/com/worksight/api/service/MemberService.java:128`
- 증거 (프론트 수신)
  - `frontend/src/domains/video-call/stores/videoCallStore.ts:256`
  - `frontend/src/domains/standup/stores/standupStore.ts:98`
  - `frontend/src/pages/ManagerDashboard.tsx:105`
- 문제
  - 백엔드는 `type` 기반 평면 구조를 보내는데, 프론트 일부는 `event + data` 구조를 기대합니다.
  - 실시간 업데이트 누락/무시 가능성이 큽니다.

### [High] 상태 변경 시간 필드 계약 불일치
- 증거
  - `backend/src/main/java/com/worksight/api/dto/WorkLogDto.java:34` (`changedAt`)
  - `backend/src/main/java/com/worksight/api/dto/MemberStatusDto.java:39` (`updatedAt`)
  - `frontend/src/pages/ManagerDashboard.tsx:122` (`broadcast.changedAt`만 사용)
- 문제
  - 일부 이벤트에서 시간 파싱 실패(Invalid Date) 가능.
  - 로그 정렬/표시 정확도 저하.

### [Medium] 로컬/개발 환경 값 하드코딩
- 증거
  - `backend/src/main/java/com/worksight/api/config/SecurityConfig.java:101`
  - `backend/src/main/java/com/worksight/api/config/WebSocketConfig.java:25`
  - `frontend/src/hooks/useMonitorWS.ts:22`
  - `ai_model/src/main.py:18`
  - `ai_model/server.py:27`
- 문제
  - 운영 전환 시 코드 수정이 필요해 배포 안정성이 떨어집니다.

### [Medium] 프론트 핵심 페이지의 과도한 비대화 및 책임 혼재
- 증거
  - `frontend/src/pages/EmployeeView.tsx` (765 lines)
  - `frontend/src/pages/ManagerDashboard.tsx` (640 lines)
- 문제
  - UI, 상태 계산, 소켓 구독, 폼 처리, 도메인 규칙이 한 파일에 섞여 테스트/변경 난이도 상승.

### [Medium] 시간/로그 처리에서 로케일 문자열을 원본 데이터로 사용
- 증거
  - `frontend/src/domains/commute/stores/commuteStore.ts:86`
  - `frontend/src/pages/ManagerDashboard.tsx:177`
- 문제
  - `toLocaleString('ko-KR')` 결과 문자열을 정렬/비교해 브라우저/OS 의존 문제가 생깁니다.
  - 데이터 정합성과 재현성 저하.

### [Medium] 팀 초대 코드 저장 방식의 구조적 한계
- 증거
  - `backend/src/main/java/com/worksight/api/service/MemberService.java:32`
  - `backend/src/main/java/com/worksight/api/service/MemberService.java:99`
- 문제
  - 메모리(`ConcurrentHashMap`) 기반이라 서버 재시작/다중 인스턴스에서 코드 소실.
  - 만료 시간(300초) 하드코딩.

### [Medium] 타입 안전성 부족 (`any`, 런타임 가정)
- 증거
  - `frontend/src/pages/ManagerDashboard.tsx:60`
  - `frontend/src/pages/ManagerDashboard.tsx:102`
  - `frontend/src/domains/video-call/stores/videoCallStore.ts:60`
  - `frontend/src/domains/standup/stores/standupStore.ts:24`
- 문제
  - 계약 드리프트를 컴파일 단계에서 탐지하지 못함.

## 3) 개선 명세 (실행 계획)

## 3-1. 목표
- 목표 A: 보안 하드코딩 제거 (Secret/SSL)
- 목표 B: 실시간 이벤트 계약을 단일 표준으로 통합
- 목표 C: 시간/상태 데이터 모델 정규화
- 목표 D: 대형 페이지 분해로 책임 분리
- 목표 E: 타입 안정성 강화로 회귀 방지

## 3-2. 비목표 (이번 라운드에서 제외)
- UI 리디자인
- 도메인 정책(업무 상태 규칙) 자체 변경
- 인프라 전체 재구축

## 3-3. 상세 요구사항

### 요구사항 A: 설정 외부화
- `jwt.secret`은 환경변수로만 주입하고 기본값을 제거한다.
- `allowedOrigins`, `ws allowed origins`, `AI backend URL`, `AI WS URL`을 설정 파일/환경변수로 이동한다.
- 개발 기본값은 `application-local.yaml` 또는 `.env.local`로 분리한다.

완료 기준
- 저장소 내 평문 비밀값 없음.
- 로컬/스테이징/운영 설정 파일 분리.
- 문서에 환경변수 표 추가.

### 요구사항 B: WebSocket 이벤트 계약 표준화
- 표준 Envelope를 도입한다.
  - `event`: string
  - `data`: object
  - `occurredAt`: ISO-8601 string
  - `version`: string (`"v1"`)
- 백엔드 WS 발신부(상태/스탠드업/미팅/알림)를 동일 구조로 통일한다.
- 프론트 수신 핸들러는 `event` 기반으로 일원화한다.

완료 기준
- `type`, `changedAt`, `updatedAt` 혼재 제거.
- WS 계약 테스트(백엔드 DTO 직렬화 + 프론트 파서) 통과.

### 요구사항 C: 시간 데이터 정규화
- 저장 계층(store/state)에서는 `epochMs` 또는 ISO 문자열만 저장한다.
- 화면 표시에서만 `Intl.DateTimeFormat`을 사용한다.
- 정렬/비교는 숫자(epoch) 기준으로 수행한다.

완료 기준
- `localeCompare` 기반 시간 정렬 제거.
- 브라우저/OS와 무관한 동일 정렬 결과 보장.

### 요구사항 D: 프론트 구조 분해
- `EmployeeView` 분해
  - `useEmployeeRealtime` (WS 구독/실시간 상태)
  - `useAiMonitoringLoop` (카메라 프레임 루프/AI WS)
  - `EmployeeWorkPanel`, `EmployeeStandupPanel`, `EmployeeVideoPanel`
- `ManagerDashboard` 분해
  - `useManagerRealtime`, `useMemberStatusDerived`, `useStandupFilter`
  - `ManagerSummaryCards`, `ManagerRealtimeBoard`, `ManagerStandupFeed`

완료 기준
- 페이지 파일 250 lines 이하.
- 비즈니스 로직 훅 분리.
- 각 훅 단위 테스트 추가.

### 요구사항 E: 타입 안전성 강화
- WS 이벤트 타입을 `discriminated union`으로 정의한다.
- `any` 제거, 런타임 파싱에 `zod` 또는 수동 type guard 적용.
- 이벤트 처리 switch에서 `never` exhaustive check를 강제한다.

완료 기준
- `any` 사용 0건(예외 주석 승인 케이스만 허용).
- 타입 미스매치가 빌드 단계에서 실패.

### 요구사항 F: 초대 코드 저장소 개선
- `inviteStore`를 DB 테이블 또는 Redis로 이전.
- 만료 시간은 `invite.expiration-seconds` 설정값으로 외부화.
- 만료/중복/재시도 정책을 명시한다.

완료 기준
- 서버 재시작 후에도 초대 코드 정책 일관성 유지.
- 만료값 코드 하드코딩 제거.

## 3-4. 단계별 적용 순서
- 1단계 (즉시): A, B, C (보안 + 실시간 계약 + 시간 정규화)
- 2단계: E (타입 안전성)
- 3단계: D, F (구조 개선 + 저장소 개선)

## 3-5. 검증 계획
- 단위 테스트
  - WS 페이로드 파서/핸들러
  - 시간 정렬 유틸
  - 상태 변환 매퍼
- 통합 테스트
  - 출근/상태변경/스탠드업/회의 이벤트 수신 시 UI 갱신 확인
- 회귀 테스트
  - 매니저 대시보드 실시간 로그 timestamp 표시
  - 직원 화면 경보/초대/요청 처리

## 3-6. 리스크 및 대응
- 리스크: WS 계약 변경 시 구버전 프론트 호환성 문제
  - 대응: `version` 필드와 어댑터 계층으로 점진 전환
- 리스크: 대형 페이지 분해 중 UI 회귀
  - 대응: 스냅샷 + 사용자 시나리오 테스트 병행

## 4) 빠른 개선 체크리스트
- [ ] `application.yaml`의 JWT secret 제거 및 환경변수화
- [ ] `server.py`의 SSL 전역 비활성 코드 제거
- [ ] WS 페이로드를 `event/data/occurredAt/version`으로 통일
- [ ] `changedAt`/`updatedAt`를 `occurredAt` 단일 필드로 통합
- [ ] `toLocaleString` 원본 저장 제거, ISO/epoch 저장으로 전환
- [ ] `EmployeeView`/`ManagerDashboard` 책임 분리 리팩터링 시작
- [ ] `any` 제거 및 WS 타입 가드 도입
- [ ] 초대 코드 만료값(300초) 설정 외부화 + 영속 저장소 전환
