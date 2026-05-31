# WorkSight 프론트엔드 API 명세서

> **프로젝트**: WorkSight — AI 기반 스마트 근무 관리 플랫폼  
> **모듈**: Frontend (React + TypeScript + Vite)  
> **버전**: v1.0  
> **최종 수정일**: 2025-05-31  
> **작성 목적**: 기말 프로젝트 제출용 — 프론트엔드가 소비하는 외부 API 규격 및 내부 아키텍처 설명

---

## 목차

1. [API 개요](#1-api-개요)
2. [인증과 권한 부여](#2-인증과-권한-부여)
3. [프론트엔드 아키텍처](#3-프론트엔드-아키텍처)
4. [자원 모델 (Resource Model)](#4-자원-모델-resource-model)
5. [엔드포인트 상세](#5-엔드포인트-상세)
   - [5.1 인증 (Auth)](#51-인증-auth)
   - [5.2 팀 관리 (Team)](#52-팀-관리-team)
   - [5.3 출퇴근 및 상태 (Commute / Status)](#53-출퇴근-및-상태-commute--status)
   - [5.4 채팅 (Messaging)](#54-채팅-messaging)
   - [5.5 미팅룸 (Video Call)](#55-미팅룸-video-call)
   - [5.6 알림 (Notification)](#56-알림-notification)
   - [5.7 스탠드업 (Standup)](#57-스탠드업-standup)
6. [실시간 통신 — STOMP WebSocket](#6-실시간-통신--stomp-websocket)
7. [AI 모니터링 WebSocket 연동](#7-ai-모니터링-websocket-연동)
8. [에러 처리](#8-에러-처리)
9. [상태 관리 (Zustand Stores)](#9-상태-관리-zustand-stores)
10. [라우팅 구조](#10-라우팅-구조)

---

## 1. API 개요

WorkSight 프론트엔드는 **Spring Boot 백엔드 REST API**와 **AI 모니터링 서버 WebSocket**을 소비하는 SPA(Single Page Application)입니다.

| 항목 | 값 |
|------|-----|
| **프레임워크** | React 19 + TypeScript 6 + Vite 8 |
| **상태 관리** | Zustand 5 (도메인별 분리) |
| **라우팅** | React Router v7 (BrowserRouter) |
| **스타일링** | Tailwind CSS 4 |
| **아이콘** | Lucide React |
| **차트** | Recharts |
| **테스트** | Vitest + @testing-library/react |

### 통신 방식

프론트엔드는 3가지 통신 채널을 사용합니다:

```
┌─────────────┐     REST (HTTP)       ┌──────────────────┐
│  Frontend   │ ◄──────────────────► │  Spring Boot     │
│  (React)    │     STOMP/SockJS      │  Backend         │
│             │ ◄──────────────────► │  :8080           │
└──────┬──────┘                       └──────────────────┘
       │
       │  Raw WebSocket (JSON)       ┌──────────────────┐
       └──────────────────────────► │  AI Model Server │
                                     │  :8765           │
                                     └──────────────────┘
```

| 채널 | 프로토콜 | 용도 | 엔드포인트 수 |
|------|----------|------|--------------|
| REST API | HTTP(S) JSON | CRUD 요청/응답 | **30개** |
| STOMP WebSocket | SockJS → STOMP | 실시간 이벤트 수신 | **10+ 이벤트 타입** |
| AI WebSocket | 순수 WebSocket JSON | 카메라 프레임 분석 | **3 send / 3 receive** |

### Base URL

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
```

- 개발 환경: `http://localhost:8080/api`
- 프로덕션: Vite proxy 또는 동일 도메인 `/api`

---

## 2. 인증과 권한 부여

### 인증 흐름

```
[사용자] → POST /members/login → [백엔드]
                                      │
                              ┌───────┴───────┐
                              │ LoginResponse  │
                              │ { token,       │
                              │   refreshToken,│
                              │   id, username,│
                              │   role }       │
                              └───────┬───────┘
                                      │
                    sessionStorage에 token/refreshToken/user 저장
                                      │
                    이후 모든 API 요청에 Authorization 헤더 포함
```

### 토큰 저장

| 키 | 저장소 | 설명 |
|----|--------|------|
| `token` | sessionStorage | JWT Access Token (Bearer) |
| `refresh_token` | sessionStorage | Refresh Token (재발급용) |
| `worksight_user` | sessionStorage | `AuthUser` JSON 직렬화 |

### 인증 헤더

```http
Authorization: Bearer <accessToken>
```

### Public 엔드포인트 (토큰 불필요)

| 경로 | 설명 |
|------|------|
| `POST /members/signup` | 회원가입 |
| `POST /members/login` | 로그인 |
| `POST /members/reissue` | 토큰 재발급 |

### 401 Unauthorized 자동 처리

모든 API 응답에서 `401 Unauthorized`가 반환되면 프론트엔드는 자동으로:
1. `authStore.logout()` 호출
2. 모든 localStorage / sessionStorage 클리어
3. 로그인 페이지로 리다이렉트

```typescript
// src/lib/api.ts
function handleUnauthorized(): never {
  const { logout } = useAuthStore.getState();
  logout();
  throw new Error('Unauthorized');
}
```

### 역할 기반 접근 제어

| 역할 | 값 | 접근 가능 기능 |
|------|-----|---------------|
| `MANAGER` | `'MANAGER'` | 팀 생성/삭제, 팀원 상태 모니터링, 알림 발송, 대시보드 |
| `EMPLOYEE` | `'EMPLOYEE'` | 팀 합류, 출퇴근, 스탠드업 작성, 채팅, 미팅 |

---

## 3. 프론트엔드 아키텍처

### 디렉토리 구조

```
frontend/src/
├── lib/                          # 공통 유틸리티 & 인프라
│   ├── api.ts                    # REST API 클라이언트 (30+ 함수)
│   ├── types.ts                  # 글로벌 TypeScript 타입 정의
│   ├── websocket.ts              # STOMP WebSocket 서비스 (싱글톤)
│   ├── wsEvent.ts                # WebSocket 이벤트 envelope 파서
│   ├── constants.ts              # 저장소 키, 토픽 패턴, 상태 라벨
│   ├── datetime.ts               # 날짜 포맷 유틸
│   └── userScopedStorage.ts      # 사용자별 localStorage 격리
│
├── domains/                      # 도메인 주도 모듈 분리
│   ├── auth/stores/              # authStore (Zustand)
│   ├── commute/stores/           # commuteStore (Zustand + persist)
│   ├── messaging/                # 채팅 도메인
│   │   ├── api.ts                # 채팅 전용 API 함수 (8개)
│   │   ├── types/index.ts        # 채팅 전용 타입
│   │   ├── stores/               # messageStore (Zustand)
│   │   └── hooks/                # useMessageWebSocket 훅
│   ├── standup/stores/           # standupStore (Zustand + persist)
│   ├── team/stores/              # teamStore (Zustand)
│   └── video-call/stores/        # videoCallStore (Zustand + persist)
│
├── hooks/                        # 글로벌 커스텀 훅
│   └── useMonitorWS.ts           # AI 모니터링 WebSocket 훅
│
├── pages/                        # 페이지 컴포넌트
│   ├── Home.tsx, Login.tsx, ...   # 공개 페이지
│   ├── EmployeeView.tsx          # 직원 뷰
│   ├── ManagerDashboard.tsx      # 매니저 대시보드
│   └── meetingroom/              # 미팅룸 페이지 & 컨트롤러
│
├── components/                   # 공유 UI 컴포넌트
├── AppRoutes.tsx                 # 라우트 정의
└── main.tsx                      # 엔트리 포인트
```

### API 클라이언트 구조

`src/lib/api.ts`에 정의된 3개의 헬퍼 함수가 모든 HTTP 통신의 기반입니다:

| 함수 | HTTP Method | 반환 타입 | 용도 |
|------|-------------|----------|------|
| `postJSON<T>(path, body)` | POST | `Promise<T>` | 인증 불필요한 POST 요청 |
| `fetchWithAuth(path)` | GET | `Promise<Response>` | 인증 필요한 GET (raw Response) |
| `requestWithAuth<T>(path, method, body?)` | Any | `Promise<T>` | 인증 필요한 모든 메서드 |

---

## 4. 자원 모델 (Resource Model)

### Enum 타입

```typescript
type Role = 'EMPLOYEE' | 'MANAGER';

type AiStatusType = 'WORKING' | 'MEETING' | 'AWAY' | 'FOCUS';

type StatusType = 'WORKING' | 'MEETING' | 'AWAY' | 'FOCUS' | 'OFFLINE';

type ChatMessageType = 'NORMAL' | 'URGENT';

type ChatRoomType = 'DIRECT' | 'TEAM';

type NotificationType = 'GENERAL' | 'IMPORTANT';

type MeetingRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
```

### 상태 라벨 매핑

| StatusType | 한국어 라벨 | UI 색상 |
|------------|------------|---------|
| `WORKING` | 근무 중 | 초록색 (green) |
| `MEETING` | 회의 중 | 보라색 (purple) |
| `AWAY` | 자리비움 | 노란색 (yellow) |
| `FOCUS` | 집중 중 | 파란색 (blue) |
| `OFFLINE` | 오프라인 | 회색 (gray) |

### 핵심 DTO 타입

#### Auth 관련

```typescript
interface SignUpRequest {
  username: string;
  password: string;
  role: Role;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  id: number;
  username: string;
  role: Role;
  virtualBalance: number;
}

interface MemberResponse {
  id: number;
  username: string;
  role: Role;
  balance: number;
}

interface AuthUser {
  id: number;
  username: string;
  role: Role;
  balance: number;
}
```

#### Team 관련

```typescript
interface CreateTeamRequest {
  teamName: string;
  description?: string;
}

interface CreateTeamResponse {
  teamId: number;
  teamName: string;
  inviteCode: string;
}

interface MyTeamResponse {
  teamId: number;
  teamName: string;
  managerId: number;
  managerUsername: string;
}

interface MyTeamsApiResponse {
  teamId: number;
  teamName: string;
  managerId: number;
  managerUsername: string;
  memberCount: number;
  createdAt: string;
}

interface TeamMemberResponse {
  id: number;
  username: string;
  role: Role;
  virtualBalance: number;
}

interface JoinTeamRequest {
  inviteCode: string;
}
```

#### Commute / Status 관련

```typescript
interface ClockInResponse {
  workLogId: number;
  memberId: number;
  username: string;
  workDate: string;
  clockInTime: string;
}

interface ClockOutResponse {
  workLogId: number;
  memberId: number;
  username: string;
  workDate: string;
  clockInTime: string;
  clockOutTime: string;
}

interface StatusUpdateResponse {
  memberId: number;
  username: string;
  statusType: StatusType;
  updatedAt: string;
}

interface TeamMemberStatusResponse {
  memberId: number;
  username: string;
  statusType: StatusType;
  updatedAt: string;
}
```

#### Messaging 관련

```typescript
interface ChatRoomResponse {
  roomId: number;
  roomType: ChatRoomType;
  otherMemberId?: number;
  otherMemberUsername?: string;
  otherMemberStatus?: UserStatus;
  roomName?: string;
  participantCount: number;
  lastMessage?: ChatMessageResponse;
  unreadCount: number;
}

interface ChatRoomDetailResponse {
  roomId: number;
  otherMemberId?: number;
  otherMemberUsername?: string;
  otherMemberStatus?: UserStatus;
  roomName?: string;
  managerId?: number;
  participants?: TeamParticipant[];
  messages: ChatMessageResponse[];
}

interface ChatMessageResponse {
  messageId: number;
  roomId: number;
  roomType: ChatRoomType;
  senderId: number;
  senderUsername: string;
  content: string;
  messageType: ChatMessageType;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

interface ReceiverStatusBannerResponse {
  otherMemberId: number;
  otherMemberUsername: string;
  otherMemberStatus: UserStatus;
  showBanner: boolean;
  canSendUrgent: boolean;
  bannerMessage?: string;
}
```

#### Meeting 관련

```typescript
interface MeetingRoomResponse {
  roomId: number;
  title: string;
  hostId: number;
  hostUsername: string;
  active: boolean;
  participantCount: number;
  createdAt: string;
}

interface MeetingRoomDetailResponse {
  roomId: number;
  title: string;
  hostId: number;
  hostUsername: string;
  active: boolean;
  participants: MeetingParticipantResponse[];
  createdAt: string;
}

interface MeetingParticipantResponse {
  participantId: number;
  memberId: number;
  username: string;
  requestStatus: MeetingRequestStatus;
  invited: boolean;
}

interface JoinRequestResponse {
  participantId: number;
  roomId: number;
  memberId: number;
  username: string;
  requestStatus: MeetingRequestStatus;
}
```

#### Notification 관련

```typescript
interface NotificationResponse {
  notificationId: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  receiverUsername: string;
  message: string;
  notificationType: NotificationType;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

interface UnreadCountResponse {
  unreadCount: number;
}
```

#### Standup 관련

```typescript
interface StandupResponse {
  standupId: number;
  memberId: number;
  username: string;
  standupDate: string;
  goal?: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamStandupResponse {
  standupDate: string;
  standups: StandupResponse[];
}
```

---

## 5. 엔드포인트 상세

### 5.1 인증 (Auth)

#### `POST /members/signup` — 회원가입

| 항목 | 값 |
|------|-----|
| **인증** | ❌ 불필요 (Public) |
| **프론트 함수** | `api.signUp(request)` |
| **Zustand 연동** | `authStore.signUp()` → 가입 후 자동 로그인 |

**Request Body:**
```json
{
  "username": "hong123",
  "password": "secure_password",
  "role": "EMPLOYEE"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "hong123",
  "role": "EMPLOYEE",
  "balance": 0
}
```

---

#### `POST /members/login` — 로그인

| 항목 | 값 |
|------|-----|
| **인증** | ❌ 불필요 (Public) |
| **프론트 함수** | `api.login(request)` |
| **Zustand 연동** | `authStore.login()` → sessionStorage에 토큰 저장 |

**Request Body:**
```json
{
  "username": "hong123",
  "password": "secure_password"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "id": 1,
  "username": "hong123",
  "role": "EMPLOYEE",
  "virtualBalance": 10000
}
```

---

#### `POST /members/reissue` — 토큰 재발급

| 항목 | 값 |
|------|-----|
| **인증** | ❌ 불필요 (Public) |
| **프론트 함수** | `api.reissueToken(request)` |

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...(새 토큰)",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "id": 1,
  "username": "hong123",
  "role": "EMPLOYEE",
  "virtualBalance": 10000
}
```

---

### 5.2 팀 관리 (Team)

#### `POST /teams` — 팀 생성

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `MANAGER` 전용 |
| **프론트 함수** | `api.createTeamAndInviteCode(request)` |
| **Zustand 연동** | `teamStore.createTeamFromServer()` |

**Request Body:**
```json
{
  "teamName": "개발팀",
  "description": "프론트엔드/백엔드 개발팀"
}
```

**Response (200 OK):**
```json
{
  "teamId": 1,
  "teamName": "개발팀",
  "inviteCode": "ABC123XY"
}
```

---

#### `GET /teams/my-teams` — 관리자 소유 팀 목록

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `MANAGER` 전용 |
| **프론트 함수** | `api.getMyTeams()` |
| **Zustand 연동** | `teamStore.fetchMyTeams()` |

**Response (200 OK):**
```json
[
  {
    "teamId": 1,
    "teamName": "개발팀",
    "managerId": 1,
    "managerUsername": "manager_hong",
    "memberCount": 5,
    "createdAt": "2025-05-30T09:00:00"
  }
]
```

---

#### `GET /teams/my-team` — 직원 소속 팀 조회

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `EMPLOYEE` 전용 |
| **프론트 함수** | `api.getMyTeam()` |
| **Zustand 연동** | `teamStore.fetchMyTeam()` |

**Response (200 OK):**
```json
{
  "teamId": 1,
  "teamName": "개발팀",
  "managerId": 1,
  "managerUsername": "manager_hong"
}
```

---

#### `GET /teams/{teamId}/members` — 팀 멤버 목록

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `MANAGER` 또는 `EMPLOYEE` |
| **프론트 함수** | `api.getTeamMembers(teamId)` |
| **Zustand 연동** | `teamStore.fetchTeamMembers()` |

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `teamId` | `number` | 팀 ID |

**Response (200 OK):**
```json
[
  {
    "id": 2,
    "username": "employee_kim",
    "role": "EMPLOYEE",
    "virtualBalance": 5000
  }
]
```

---

#### `DELETE /teams/{teamId}` — 팀 삭제

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `MANAGER` (팀 소유자만) |
| **프론트 함수** | `api.deleteTeam(teamId)` |
| **Zustand 연동** | `teamStore.deleteTeam()` |

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `teamId` | `number` | 삭제할 팀 ID |

**Response:** `200 OK` (빈 응답)

---

#### `POST /members/join-team` — 팀 합류

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `EMPLOYEE` 전용 |
| **프론트 함수** | `api.joinTeam(request)` |

**Request Body:**
```json
{
  "inviteCode": "ABC123XY"
}
```

**Response:** `200 OK` (빈 응답)

---

### 5.3 출퇴근 및 상태 (Commute / Status)

#### `POST /work/clock-in` — 출근

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.clockIn()` |
| **Zustand 연동** | `commuteStore.checkIn()` |
| **부수 효과** | 백엔드에서 `STATUS_CHANGED(WORKING)` WebSocket 브로드캐스트 |

**Request Body:** `{}` (빈 객체)

**Response (200 OK):**
```json
{
  "workLogId": 1,
  "memberId": 2,
  "username": "employee_kim",
  "workDate": "2025-05-31",
  "clockInTime": "2025-05-31T09:00:00"
}
```

---

#### `POST /work/clock-out` — 퇴근

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.clockOut()` |
| **Zustand 연동** | `commuteStore.checkOut()` |
| **부수 효과** | 백엔드에서 `STATUS_CHANGED(OFFLINE)` WebSocket 브로드캐스트 |

**Request Body:** `{}` (빈 객체)

**Response (200 OK):**
```json
{
  "workLogId": 1,
  "memberId": 2,
  "username": "employee_kim",
  "workDate": "2025-05-31",
  "clockInTime": "2025-05-31T09:00:00",
  "clockOutTime": "2025-05-31T18:00:00"
}
```

---

#### `PUT /status/ai` — AI 상태 업데이트

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.updateAiStatus(statusType)` |
| **Zustand 연동** | `commuteStore.setUserState()` |
| **호출 주체** | AI 모니터링 서버 또는 프론트엔드 |
| **허용 값** | `WORKING`, `AWAY`, `FOCUS` (`MEETING` 전송 시 400 에러) |

**Request Body:**
```json
{
  "statusType": "WORKING"
}
```

**Response (200 OK):**
```json
{
  "memberId": 2,
  "username": "employee_kim",
  "statusType": "WORKING",
  "updatedAt": "2025-05-31T09:15:00"
}
```

---

#### `PUT /status/manual` — 수동 상태 설정

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.updateManualStatus(statusType)` |
| **Zustand 연동** | `commuteStore.setUserState()` (FOCUS 상태 시) |
| **허용 값** | `FOCUS` 만 |

**Request Body:**
```json
{
  "statusType": "FOCUS"
}
```

**Response (200 OK):** `StatusUpdateResponse` (위와 동일 구조)

---

#### `GET /status/team/{managerId}` — 팀 상태 조회

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `MANAGER` 전용 |
| **프론트 함수** | `api.getTeamMemberStatuses(managerId)` |

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `managerId` | `number` | 매니저 ID |

**Response (200 OK):**
```json
[
  {
    "memberId": 2,
    "username": "employee_kim",
    "statusType": "WORKING",
    "updatedAt": "2025-05-31T09:15:00"
  },
  {
    "memberId": 3,
    "username": "employee_lee",
    "statusType": "AWAY",
    "updatedAt": "2025-05-31T09:10:00"
  }
]
```

---

### 5.4 채팅 (Messaging)

> 📁 채팅 API는 `src/domains/messaging/api.ts`에 별도 정의되어 있습니다.

#### `GET /chat/rooms` — 채팅방 목록

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `messagingApi.getRooms()` |
| **Zustand 연동** | `messageStore.setRooms()` |

**Response (200 OK):**
```json
[
  {
    "roomId": 1,
    "roomType": "DIRECT",
    "otherMemberId": 3,
    "otherMemberUsername": "employee_lee",
    "otherMemberStatus": "WORKING",
    "participantCount": 2,
    "lastMessage": {
      "messageId": 10,
      "content": "안녕하세요!",
      "createdAt": "2025-05-31T10:30:00"
    },
    "unreadCount": 2
  },
  {
    "roomId": 2,
    "roomType": "TEAM",
    "roomName": "개발팀 채팅",
    "participantCount": 5,
    "lastMessage": null,
    "unreadCount": 0
  }
]
```

---

#### `POST /chat/rooms/{otherMemberId}/enter` — 1:1 채팅방 입장

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `messagingApi.enterDirectRoom(otherMemberId)` |
| **Zustand 연동** | `messageStore.setActiveRoom()` |
| **비고** | 채팅방이 없으면 자동 생성 |

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `otherMemberId` | `number` | 대화 상대 멤버 ID |

**Response (200 OK):**
```json
{
  "roomId": 1,
  "otherMemberId": 3,
  "otherMemberUsername": "employee_lee",
  "otherMemberStatus": "WORKING",
  "messages": [
    {
      "messageId": 1,
      "roomId": 1,
      "roomType": "DIRECT",
      "senderId": 2,
      "senderUsername": "employee_kim",
      "content": "안녕하세요!",
      "messageType": "NORMAL",
      "read": true,
      "createdAt": "2025-05-31T10:30:00"
    }
  ]
}
```

---

#### `POST /chat/rooms/{roomId}/team/enter` — 팀 채팅방 입장

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `messagingApi.enterTeamRoom(roomId)` |
| **Zustand 연동** | `messageStore.setActiveRoom()` |

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `number` | 팀 채팅방 ID |

**Response (200 OK):** `ChatRoomDetailResponse` (위 1:1과 유사, `participants` 필드 추가)

---

#### `POST /chat/rooms/{roomId}/messages` — 메시지 전송

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `messagingApi.sendDirectMessage(roomId, content, messageType?)` / `messagingApi.sendTeamMessage(roomId, content)` |
| **Zustand 연동** | `messageStore.addMessage()` |

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `number` | 채팅방 ID |

**Request Body:**
```json
{
  "content": "지금 회의 가능하신가요?",
  "messageType": "NORMAL"
}
```

> `messageType`은 `"NORMAL"` 또는 `"URGENT"`. 팀 메시지는 항상 `"NORMAL"`.

**Response (200 OK):**
```json
{
  "messageId": 11,
  "roomId": 1,
  "roomType": "DIRECT",
  "senderId": 2,
  "senderUsername": "employee_kim",
  "content": "지금 회의 가능하신가요?",
  "messageType": "NORMAL",
  "read": false,
  "createdAt": "2025-05-31T10:35:00"
}
```

---

#### `GET /chat/rooms/{otherMemberId}/status-banner` — 상대방 상태 배너

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `messagingApi.getStatusBanner(otherMemberId)` |
| **Zustand 연동** | `messageStore.setBannerInfo()` |

**Response (200 OK):**
```json
{
  "otherMemberId": 3,
  "otherMemberUsername": "employee_lee",
  "otherMemberStatus": "AWAY",
  "showBanner": true,
  "canSendUrgent": true,
  "bannerMessage": "현재 자리비움 상태입니다."
}
```

---

#### `POST /chat/rooms/{roomId}/read` — 읽음 처리

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `messagingApi.markDirectAsRead(roomId)` / `messagingApi.markTeamAsRead(roomId)` |
| **부수 효과** | 상대방에게 `CHAT_READ` WebSocket 이벤트 전달 |

**Response:** `200 OK` (빈 응답)

---

### 5.5 미팅룸 (Video Call)

#### `POST /meetings` — 미팅룸 생성

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.createMeeting(title)` |
| **Zustand 연동** | `videoCallStore.createRoom()` |
| **부수 효과** | `ROOM_CREATED` WebSocket 브로드캐스트 |

**Request Body:**
```json
{
  "title": "주간 스프린트 회의"
}
```

**Response (200 OK):**
```json
{
  "roomId": 1,
  "title": "주간 스프린트 회의",
  "hostId": 1,
  "hostUsername": "manager_hong",
  "active": true,
  "participantCount": 1,
  "createdAt": "2025-05-31T14:00:00"
}
```

---

#### `GET /meetings` — 진행 중 미팅 목록

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.getMeetings()` |
| **Zustand 연동** | `videoCallStore.loadRooms()` |

**Response (200 OK):** `MeetingRoomResponse[]`

---

#### `GET /meetings/{roomId}` — 미팅 상세

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.getMeetingDetail(roomId)` |
| **Zustand 연동** | `videoCallStore.loadActiveRoomDetail()` |

**Response (200 OK):**
```json
{
  "roomId": 1,
  "title": "주간 스프린트 회의",
  "hostId": 1,
  "hostUsername": "manager_hong",
  "active": true,
  "participants": [
    {
      "participantId": 1,
      "memberId": 1,
      "username": "manager_hong",
      "requestStatus": "ACCEPTED",
      "invited": false
    }
  ],
  "createdAt": "2025-05-31T14:00:00"
}
```

---

#### `POST /meetings/{roomId}/join-request` — 참가 요청

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.requestJoinMeeting(roomId)` |
| **부수 효과** | 호스트에게 `JOIN_REQUESTED` WebSocket 이벤트 |

**Response (200 OK):** `JoinRequestResponse`

---

#### `POST /meetings/{roomId}/invite` — 미팅 초대

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.inviteToMeeting(roomId, memberId)` |
| **부수 효과** | 초대 대상에게 `INVITED` WebSocket 이벤트 |

**Request Body:**
```json
{
  "memberId": 3
}
```

**Response (200 OK):** `JoinRequestResponse`

---

#### `PUT /meetings/{roomId}/requests/{participantId}` — 참가 요청 수락/거절

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.respondToJoinRequest(roomId, participantId, accept)` |
| **부수 효과** | 요청자에게 `REQUEST_ACCEPTED` 또는 `REQUEST_REJECTED` |

**Request Body:**
```json
{
  "accept": true
}
```

**Response (200 OK):** `JoinRequestResponse`

---

#### `PUT /meetings/{roomId}/invite-response` — 초대 수락/거절

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.respondToInvitation(roomId, accept)` |

**Request Body:**
```json
{
  "accept": true
}
```

**Response (200 OK):** `JoinRequestResponse`

---

#### `DELETE /meetings/{roomId}` — 미팅 종료

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token (호스트만) |
| **프론트 함수** | `api.endMeeting(roomId)` |
| **부수 효과** | `ROOM_ENDED` WebSocket 브로드캐스트 |

**Response:** `200 OK` (빈 응답)

---

#### `DELETE /meetings/{roomId}/leave` — 미팅 나가기

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.leaveMeeting(roomId)` |
| **부수 효과** | `MEMBER_LEFT` WebSocket 브로드캐스트 |

**Response:** `200 OK` (빈 응답)

---

### 5.6 알림 (Notification)

#### `POST /notifications` — 알림 발송

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **역할 제한** | `MANAGER` 전용 |
| **프론트 함수** | `api.sendNotification(receiverId, message, notificationType)` |
| **Zustand 연동** | `commuteStore.sendDirectPing()` (긴급 알림 시) |
| **부수 효과** | 수신자에게 `NOTIFICATION_RECEIVED` WebSocket 이벤트 |

**Request Body:**
```json
{
  "receiverId": 3,
  "message": "지금 자리에 와주세요.",
  "notificationType": "IMPORTANT"
}
```

**Response (200 OK):**
```json
{
  "notificationId": 1,
  "senderId": 1,
  "senderUsername": "manager_hong",
  "receiverId": 3,
  "receiverUsername": "employee_lee",
  "message": "지금 자리에 와주세요.",
  "notificationType": "IMPORTANT",
  "read": false,
  "createdAt": "2025-05-31T11:00:00"
}
```

---

#### `GET /notifications` — 전체 알림 조회

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.getNotifications()` |

**Response (200 OK):** `NotificationResponse[]`

---

#### `GET /notifications/unread` — 미읽은 알림 조회

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.getUnreadNotifications()` |
| **Zustand 연동** | `commuteStore.loadDirectPings()` |

**Response (200 OK):** `NotificationResponse[]`

---

#### `GET /notifications/unread/count` — 미읽은 알림 수

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.getUnreadNotificationsCount()` |

**Response (200 OK):**
```json
{
  "unreadCount": 3
}
```

---

#### `PATCH /notifications/{notificationId}/read` — 단건 읽음 처리

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.readNotification(notificationId)` |
| **Zustand 연동** | `commuteStore.dismissDirectPing()` |

**Response (200 OK):** `NotificationResponse`

---

#### `PATCH /notifications/read-all` — 전체 읽음 처리

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.readAllNotifications()` |

**Response:** `200 OK` (빈 응답)

---

### 5.7 스탠드업 (Standup)

#### `POST /standup/goal` — 오늘 목표 작성

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.createStandupGoal(goal)` |
| **Zustand 연동** | `standupStore.addStandup()` |
| **부수 효과** | `GOAL_UPDATED` WebSocket 브로드캐스트 |

**Request Body:**
```json
{
  "goal": "로그인 페이지 UI 완성하기"
}
```

**Response (200 OK):**
```json
{
  "standupId": 1,
  "memberId": 2,
  "username": "employee_kim",
  "standupDate": "2025-05-31",
  "goal": "로그인 페이지 UI 완성하기",
  "result": null,
  "createdAt": "2025-05-31T09:00:00",
  "updatedAt": "2025-05-31T09:00:00"
}
```

---

#### `POST /standup/result` — 오늘 결과 작성

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.createStandupResult(result)` |
| **Zustand 연동** | `standupStore.addStandup()` |
| **부수 효과** | `RESULT_UPDATED` WebSocket 브로드캐스트 |

**Request Body:**
```json
{
  "result": "로그인 페이지 UI 완성, PR 제출 완료"
}
```

**Response (200 OK):** `StandupResponse`

---

#### `GET /standup/my` — 내 오늘 스탠드업

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.getMyTodayStandup()` |
| **Zustand 연동** | `standupStore.loadMyTodayStandup()` |

**Response (200 OK):** `StandupResponse`

---

#### `GET /standup/team` — 팀 스탠드업 조회

| 항목 | 값 |
|------|-----|
| **인증** | ✅ Bearer Token |
| **프론트 함수** | `api.getTeamStandups(date?)` |
| **Zustand 연동** | `standupStore.loadTeamStandups()` |

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `date` | `string` (yyyy-MM-dd) | ❌ | 오늘 | 조회 날짜 |

**Response (200 OK):**
```json
{
  "standupDate": "2025-05-31",
  "standups": [
    {
      "standupId": 1,
      "memberId": 2,
      "username": "employee_kim",
      "standupDate": "2025-05-31",
      "goal": "로그인 UI 완성",
      "result": null,
      "createdAt": "2025-05-31T09:00:00",
      "updatedAt": "2025-05-31T09:00:00"
    }
  ]
}
```

---

## 6. 실시간 통신 — STOMP WebSocket

### 연결 설정

| 항목 | 값 |
|------|-----|
| **전송 계층** | SockJS → STOMP |
| **엔드포인트** | `/ws` (SockJS) |
| **인증** | STOMP CONNECT 시 `Authorization: Bearer <token>` 헤더 |
| **자동 재연결** | ✅ (2초 간격) |
| **프론트 클래스** | `WebSocketService` (싱글톤, `webSocketService`로 export) |

### 연결 흐름

```
1. webSocketService.connect()
2. → new SockJS('/ws')
3. → Stomp.over(socket)
4. → client.connect({ Authorization: 'Bearer <token>' })
5. → 연결 성공 → 기존 구독 자동 복구
6. → 연결 실패 → 2초 후 재연결 시도
```

### 구독 토픽 패턴

| 토픽 | 생성 함수 | 용도 |
|------|----------|------|
| `/topic/team/{teamId}` | `WEBSOCKET_TOPICS.TEAM(teamId)` | 팀 전체 브로드캐스트 |
| `/topic/members/{userId}` | `WEBSOCKET_TOPICS.MEMBER(userId)` | 개인 알림 |

### 이벤트 Envelope 형식

```typescript
interface WsEnvelope<T = unknown> {
  event: string;      // 이벤트 타입
  data: T;            // 페이로드
  occurredAt: string; // ISO 8601 타임스탬프
  version: 'v1';      // 프로토콜 버전
}
```

> **레거시 호환**: `{ type, ...rest }` 형식도 `parseWsEnvelope()`에서 v1 envelope로 자동 변환

### 이벤트 목록

#### 팀 토픽 (`/topic/team/{teamId}`)

| 이벤트 | 데이터 페이로드 | 처리 스토어 | 설명 |
|--------|----------------|-------------|------|
| `STATUS_CHANGED` | `{ memberId, username, statusType }` | `commuteStore`, `messageStore` | 팀원 상태 변경 |
| `ROOM_CREATED` | `MeetingRoomResponse` | `videoCallStore` | 새 미팅룸 생성 |
| `ROOM_ENDED` | `{ roomId }` | `videoCallStore` | 미팅룸 종료 |
| `MEMBER_JOINED` | `{ roomId, memberId, username }` | `videoCallStore` | 미팅 참가자 입장 |
| `MEMBER_LEFT` | `{ roomId, memberId }` | `videoCallStore` | 미팅 참가자 퇴장 |
| `JOIN_REQUESTED` | `JoinRequestResponse` | `videoCallStore` | 미팅 참가 요청 |
| `INVITED` | `{ roomId, roomTitle, hostName }` | `videoCallStore` | 미팅 초대 |
| `REQUEST_ACCEPTED` | `JoinRequestResponse` | `videoCallStore` | 참가 요청 승인 |
| `REQUEST_REJECTED` | `JoinRequestResponse` | `videoCallStore` | 참가 요청 거절 |
| `GOAL_UPDATED` | `StandupResponse` | `standupStore` | 스탠드업 목표 작성 |
| `RESULT_UPDATED` | `StandupResponse` | `standupStore` | 스탠드업 결과 작성 |
| `TEAM_CHAT_MESSAGE` | `ChatMessagePayload` | `messageStore` | 팀 채팅 메시지 |
| `TEAM_CHAT_MEMBER_JOINED` | `{ memberId, username, status }` | `messageStore` | 팀 채팅 멤버 합류 |
| `TEAM_LINKED` | — | — | 팀 연결 이벤트 |

#### 개인 토픽 (`/topic/members/{userId}`)

| 이벤트 | 데이터 페이로드 | 처리 스토어 | 설명 |
|--------|----------------|-------------|------|
| `CHAT_MESSAGE_RECEIVED` | `ChatMessagePayload` | `messageStore` | 1:1 채팅 메시지 수신 |
| `CHAT_URGENT_RECEIVED` | `ChatMessagePayload` | `messageStore` | 긴급 메시지 수신 |
| `CHAT_READ` | `{ roomId, readByMemberId }` | `messageStore` | 읽음 처리 알림 |
| `STATUS_CHANGED` | `{ memberId, statusType }` | `messageStore` | 1:1 채팅 상대 상태 변경 |
| `NOTIFICATION_RECEIVED` | `NotificationResponse` | `commuteStore` | 알림 수신 |
| `INVITED` | `{ roomId, roomTitle, hostName }` | `videoCallStore` | 미팅 초대 수신 |
| `JOIN_REQUESTED` | `JoinRequestResponse` | `videoCallStore` | 미팅 참가 요청 수신 |
| `REQUEST_ACCEPTED` | `JoinRequestResponse` | `videoCallStore` | 참가 승인 수신 |
| `REQUEST_REJECTED` | `JoinRequestResponse` | `videoCallStore` | 참가 거절 수신 |

### WebSocket 이벤트 페이로드 타입

```typescript
interface ChatMessagePayload {
  roomId: number;
  messageId: number;
  senderId: number;
  senderUsername: string;
  content: string;
  messageType: ChatMessageType;
  createdAt: string;
}

interface ChatReadPayload {
  roomId: number;
  readByMemberId: number;
}

interface TeamChatMemberJoinedPayload {
  memberId: number;
  username: string;
  status: UserStatus;
}

interface TeamStatusBroadcast {
  memberId: number;
  username: string;
  statusType: StatusType;
  changedAt?: string;
}
```

---

## 7. AI 모니터링 WebSocket 연동

> 이 섹션은 프론트엔드가 AI 모니터링 서버에 카메라 프레임을 전송하는 인터페이스를 설명합니다.
> AI 서버 자체의 상세 명세는 별도 문서 (`ai_model/API_SPECIFICATION.md`)를 참조하세요.

### 연결 정보

| 항목 | 값 |
|------|-----|
| **프로토콜** | 순수 WebSocket (STOMP 아님) |
| **URL** | `VITE_AI_WS_URL` 또는 `ws://localhost:8765/ws/monitor` |
| **프론트 훅** | `useMonitorWS(isMonitoring, employeeId, token)` |
| **데이터 형식** | JSON 문자열 |

### 프론트엔드 → AI 서버 메시지

| type | 전송 시점 | 페이로드 |
|------|----------|----------|
| `init` | WebSocket 연결 직후 | `{ type: 'init', employeeId: number, token: string }` |
| `frame` | 카메라 프레임 캡처마다 | `{ type: 'frame', data: string }` (`data`는 base64 인코딩 이미지) |
| `stop` | 모니터링 종료 시 | `{ type: 'stop' }` |

### AI 서버 → 프론트엔드 메시지

| type | 수신 시점 | 페이로드 |
|------|----------|----------|
| `ready` | `init` 처리 완료 후 | `{ type: 'ready' }` |
| `result` | `frame` 분석 완료 시 | `{ type: 'result', state: AiStatusType, confidence: number, fps: number }` |
| `error` | 오류 발생 시 | `{ type: 'error', message: string }` |

### `useMonitorWS` 훅 반환값

```typescript
interface UseMonitorWSReturn {
  sendFrame: (base64: string) => void;  // frame 메시지 전송
  wsReady: boolean;                     // ready 메시지 수신 여부
  error: string | null;                 // 에러 메시지
  lastResult: WSResultMsg | null;       // 최근 분석 결과
}
```

### TypeScript 메시지 타입

```typescript
interface WSInitMsg { type: 'init'; employeeId: number; token: string; refreshToken?: string; }
interface WSFrameMsg { type: 'frame'; data: string; }
interface WSStopMsg { type: 'stop'; }
interface WSResultMsg { type: 'result'; state: AiStatusType; confidence: number; fps: number; }
interface WSReadyMsg { type: 'ready'; }
interface WSErrorMsg { type: 'error'; message: string; }
```

---

## 8. 에러 처리

### 백엔드 에러 응답 형식

```json
{
  "status": 400,
  "code": "INVALID_REQUEST",
  "message": "에러 메시지",
  "timestamp": "2025-05-31T12:00:00"
}
```

### 에러 코드 목록

| HTTP Status | 에러 코드 | 설명 | 발생 상황 예시 |
|-------------|----------|------|---------------|
| 400 | `INVALID_REQUEST` | 잘못된 요청 | 필수 파라미터 누락, 유효하지 않은 값 |
| 403 | `ACCESS_DENIED` | 접근 거부 | 권한 없는 리소스 접근 |
| 404 | `NOT_FOUND` | 리소스 없음 | 존재하지 않는 팀/멤버/미팅룸 ID |
| 409 | `DUPLICATE_USERNAME` | 중복 사용자명 | 이미 존재하는 username으로 회원가입 |
| 409 | `INVALID_STATE` | 유효하지 않은 상태 | 이미 퇴근한 상태에서 퇴근 시도 |
| 409 | `ALREADY_CLOCKED_IN` | 이미 출근됨 | 출근 상태에서 재출근 시도 |
| 409 | `DUPLICATE_REQUEST` | 중복 요청 | 데이터 무결성 위반 |

### 프론트엔드 에러 처리 패턴

```typescript
// 일반적인 API 호출 패턴
try {
  const result = await api.createMeeting(title);
  // 성공 처리
} catch (error) {
  // 401 → handleUnauthorized()에서 자동 로그아웃
  // 그 외 → UI에서 에러 메시지 표시
  console.error('API call failed:', error);
}
```

---

## 9. 상태 관리 (Zustand Stores)

### 스토어 개요

| 스토어 | 파일 위치 | 영속성 | 용도 |
|--------|----------|--------|------|
| `useAuthStore` | `domains/auth/stores/authStore.ts` | sessionStorage (수동) | 인증 상태 |
| `useCommuteStore` | `domains/commute/stores/commuteStore.ts` | localStorage (zustand persist) | 출퇴근/상태/카메라 |
| `useMessageStore` | `domains/messaging/stores/useMessageStore.ts` | ❌ 메모리 전용 | 채팅 |
| `useStandupStore` | `domains/standup/stores/standupStore.ts` | localStorage (zustand persist) | 스탠드업 |
| `useTeamStore` | `domains/team/stores/teamStore.ts` | localStorage (수동) | 팀 관리 |
| `useVideoCallStore` | `domains/video-call/stores/videoCallStore.ts` | localStorage (zustand persist) | 미팅룸 |

### 사용자 스코프 격리

`commuteStore`, `standupStore`, `videoCallStore`는 **사용자별 localStorage 키**를 사용하여 멀티 계정 충돌을 방지합니다:

```typescript
// 키 패턴: 'worksight-{domain}-storage-{userId}'
const storageKey = `worksight-commute-storage-${userId}`;
```

### 크로스 탭 동기화

`commuteStore`, `standupStore`, `teamStore`, `videoCallStore`는 `window.storage` 이벤트를 통해 탭 간 상태를 동기화합니다.

### 스토어 상세

#### `useAuthStore` — 인증

| State | Type | 설명 |
|-------|------|------|
| `user` | `AuthUser \| null` | 현재 로그인 사용자 |
| `token` | `string \| null` | JWT access token |
| `isAuthenticated` | `boolean` | 인증 여부 |

| Action | API 호출 | 설명 |
|--------|---------|------|
| `login(username, password)` | `POST /members/login` | 로그인 후 토큰 저장 |
| `signUp(username, password, role)` | `POST /members/signup` → `login()` | 가입 후 자동 로그인 |
| `logout()` | — | 전체 스토리지 클리어 + 상태 초기화 |
| `getRole()` | — | 현재 역할 반환 |

#### `useCommuteStore` — 출퇴근/상태

| State | Type | 설명 |
|-------|------|------|
| `commuteStatus` | `'NONE' \| 'WORK' \| 'LEAVE'` | 출퇴근 상태 |
| `userState` | `UserStateType` | 현재 근무 상태 (한국어) |
| `checkInTime` | `string \| null` | 출근 시각 |
| `checkOutTime` | `string \| null` | 퇴근 시각 |
| `isCameraActive` | `boolean` | 카메라 활성 여부 |
| `cameraStream` | `MediaStream \| null` | 카메라 스트림 |
| `directPings` | `DirectPing[]` | 수신된 긴급 알림 |

| Action | API 호출 | 설명 |
|--------|---------|------|
| `checkIn(id, name)` | `POST /work/clock-in` | 출근 |
| `checkOut(id, name)` | `POST /work/clock-out` | 퇴근 |
| `setUserState(id, name, state)` | `PUT /status/manual` 또는 `PUT /status/ai` | 상태 변경 |
| `startCamera()` | `getUserMedia()` | 카메라 시작 |
| `stopCamera()` | — | 카메라 종료 |
| `sendDirectPing(id, name, msg)` | `POST /notifications` | 긴급 알림 발송 |
| `loadDirectPings()` | `GET /notifications/unread` | 알림 로드 |

#### `useMessageStore` — 채팅

| State | Type | 설명 |
|-------|------|------|
| `rooms` | `ChatRoomResponse[]` | 채팅방 목록 |
| `activeRoomId` | `number \| null` | 현재 활성 채팅방 |
| `activeRoom` | `ChatRoomDetailResponse \| null` | 활성 채팅방 상세 |
| `bannerInfo` | `ReceiverStatusBannerResponse \| null` | 상대 상태 배너 |

| Action | 설명 |
|--------|------|
| `setRooms(rooms)` | 채팅방 목록 설정 |
| `setActiveRoomId(id)` | 활성 채팅방 변경 (읽지않은수 초기화) |
| `addMessage(msg)` | 메시지 추가 (목록 + 상세에 반영) |
| `markMessagesAsRead(roomId, memberId)` | 읽음 처리 |
| `updateMemberStatus(memberId, status)` | 상태 업데이트 |
| `addTeamChatMember(member)` | 팀 채팅 멤버 추가 |

#### `useStandupStore` — 스탠드업

| State | Type | 설명 |
|-------|------|------|
| `standups` | `Standup[]` | 스탠드업 목록 |

| Action | API 호출 | 설명 |
|--------|---------|------|
| `addStandup(id, name, goal, result)` | `POST /standup/goal` + `POST /standup/result` | 작성 |
| `loadTeamStandups(date?)` | `GET /standup/team` | 팀 스탠드업 로드 |
| `loadMyTodayStandup()` | `GET /standup/my` | 내 스탠드업 로드 |
| `handleWebsocketEvent(envelope)` | — | WS 이벤트 처리 |

#### `useTeamStore` — 팀

| State | Type | 설명 |
|-------|------|------|
| `teams` | `Team[]` | 팀 목록 |
| `memberTeamMap` | `Record<number, string>` | 멤버→팀 매핑 |

| Action | API 호출 | 설명 |
|--------|---------|------|
| `createTeamFromServer(name, desc)` | `POST /teams` | 서버 팀 생성 |
| `deleteTeam(teamId, managerId)` | `DELETE /teams/{teamId}` | 팀 삭제 |
| `fetchMyTeam()` | `GET /teams/my-team` | 소속 팀 조회 |
| `fetchMyTeams()` | `GET /teams/my-teams` | 관리 팀 목록 |
| `fetchTeamMembers(teamId)` | `GET /teams/{teamId}/members` | 팀원 목록 |

#### `useVideoCallStore` — 미팅룸

| State | Type | 설명 |
|-------|------|------|
| `rooms` | `VideoCallRoom[]` | 미팅룸 목록 |
| `activeRoom` | `VideoCallRoom \| null` | 현재 참여 중인 미팅 |
| `joinRequests` | `JoinRequest[]` | 수신된 참가 요청 |
| `invitations` | `Invitation[]` | 수신된 초대 |

| Action | API 호출 | 설명 |
|--------|---------|------|
| `loadRooms()` | `GET /meetings` | 미팅 목록 로드 |
| `createRoom(title)` | `POST /meetings` | 미팅 생성 |
| `leaveRoom(roomId)` | `DELETE /meetings/{roomId}/leave` | 미팅 나가기 |
| `endRoom(roomId)` | `DELETE /meetings/{roomId}` | 미팅 종료 |
| `requestJoinRoom(roomId)` | `POST /meetings/{roomId}/join-request` | 참가 요청 |
| `approveJoinRequest(roomId, id)` | `PUT /meetings/{roomId}/requests/{id}` | 요청 승인 |
| `inviteUser(roomId, inviteeId)` | `POST /meetings/{roomId}/invite` | 초대 |
| `handleWebsocketEvent(envelope)` | — | WS 이벤트 처리 |

---

## 10. 라우팅 구조

### 라우트 맵

| 경로 | 컴포넌트 | 인증 | 역할 | 설명 |
|------|----------|------|------|------|
| `/` | `Home` | ❌ | — | 랜딩 페이지 |
| `/features` | `Features` | ❌ | — | 기능 소개 |
| `/how-it-works` | `HowItWorks` | ❌ | — | 사용법 안내 |
| `/pricing` | `Pricing` | ❌ | — | 가격 안내 |
| `/checkout` | `Checkout` | ❌ | — | 결제 |
| `/login` | `Login` | ❌ | — | 로그인/회원가입 |
| `/terms` | `Terms` | ❌ | — | 이용약관 |
| `/privacy` | `Privacy` | ❌ | — | 개인정보처리방침 |
| `/support` | `Support` | ❌ | — | 고객지원 |
| `/employee` | `EmployeeView` | ✅ | — | 직원 대시보드 |
| `/teams` | `TeamList` | ✅ | `MANAGER` | 팀 목록 |
| `/teams/:teamId` | `ManagerDashboard` | ✅ | `MANAGER` | 매니저 대시보드 |
| `/dashboard` | → `/teams` redirect | ✅ | `MANAGER` | 리다이렉트 |
| `/join-team` | `JoinTeam` | ✅ | `EMPLOYEE` | 팀 합류 |
| `/meetingroom` | `MeetingRoomPage` | ✅ | — | 미팅룸 |
| `/team/:teamId/messages` | `MessagePage` | ✅ | — | 팀 채팅 |

### 엔트리 포인트

```
main.tsx → <StrictMode> → <BrowserRouter> → <App /> → <AppRoutes />
```

---

## 부록: 엔드포인트 요약 표

| # | Method | Path | 도메인 | 인증 |
|---|--------|------|--------|------|
| 1 | POST | `/members/signup` | Auth | ❌ |
| 2 | POST | `/members/login` | Auth | ❌ |
| 3 | POST | `/members/reissue` | Auth | ❌ |
| 4 | POST | `/teams` | Team | ✅ |
| 5 | GET | `/teams/my-teams` | Team | ✅ |
| 6 | GET | `/teams/my-team` | Team | ✅ |
| 7 | GET | `/teams/{teamId}/members` | Team | ✅ |
| 8 | DELETE | `/teams/{teamId}` | Team | ✅ |
| 9 | POST | `/members/join-team` | Team | ✅ |
| 10 | POST | `/work/clock-in` | Commute | ✅ |
| 11 | POST | `/work/clock-out` | Commute | ✅ |
| 12 | PUT | `/status/ai` | Status | ✅ |
| 13 | PUT | `/status/manual` | Status | ✅ |
| 14 | GET | `/status/team/{managerId}` | Status | ✅ |
| 15 | GET | `/chat/rooms` | Chat | ✅ |
| 16 | POST | `/chat/rooms/{id}/enter` | Chat | ✅ |
| 17 | POST | `/chat/rooms/{id}/team/enter` | Chat | ✅ |
| 18 | POST | `/chat/rooms/{id}/messages` | Chat | ✅ |
| 19 | GET | `/chat/rooms/{id}/status-banner` | Chat | ✅ |
| 20 | POST | `/chat/rooms/{id}/read` | Chat | ✅ |
| 21 | POST | `/meetings` | Meeting | ✅ |
| 22 | GET | `/meetings` | Meeting | ✅ |
| 23 | GET | `/meetings/{roomId}` | Meeting | ✅ |
| 24 | POST | `/meetings/{roomId}/join-request` | Meeting | ✅ |
| 25 | POST | `/meetings/{roomId}/invite` | Meeting | ✅ |
| 26 | PUT | `/meetings/{roomId}/requests/{id}` | Meeting | ✅ |
| 27 | PUT | `/meetings/{roomId}/invite-response` | Meeting | ✅ |
| 28 | DELETE | `/meetings/{roomId}` | Meeting | ✅ |
| 29 | DELETE | `/meetings/{roomId}/leave` | Meeting | ✅ |
| 30 | POST | `/notifications` | Notification | ✅ |
| 31 | GET | `/notifications` | Notification | ✅ |
| 32 | GET | `/notifications/unread` | Notification | ✅ |
| 33 | GET | `/notifications/unread/count` | Notification | ✅ |
| 34 | PATCH | `/notifications/{id}/read` | Notification | ✅ |
| 35 | PATCH | `/notifications/read-all` | Notification | ✅ |
| 36 | POST | `/standup/goal` | Standup | ✅ |
| 37 | POST | `/standup/result` | Standup | ✅ |
| 38 | GET | `/standup/my` | Standup | ✅ |
| 39 | GET | `/standup/team` | Standup | ✅ |
