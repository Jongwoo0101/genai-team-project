# WorkSight API 명세서 v4.0

## 변경 이력

| 버전    | 날짜         | 변경 내용                                      |
| ----- | ---------- | ------------------------------------------ |
| v3.0  | 2026-05-20 | 초기 명세 (인증·팀·출퇴근·상태·미팅룸·알림·스탠드업)           |
| v4.0  | 2026-05-28 | **채팅 API 추가** (1:1 채팅 / 팀 채팅), Enum 추가, WebSocket 이벤트 추가 |

---

## 1. 기본 정보

* Base URL: `/api`
* Content-Type: `application/json`
* 인증: JWT Bearer 토큰 (로그인·회원가입·토큰 재발급 제외 모든 API에 필요)

### 인증 헤더

```
Authorization: Bearer {token}
```

---

## 2. 공통 에러 응답

```json
{
  "status": 400,
  "code": "INVALID_REQUEST",
  "message": "에러 내용",
  "timestamp": "2026-05-20T10:00:00"
}
```

| HTTP  | code                 | 설명                                      |
| ----- | -------------------- | --------------------------------------- |
| `400` | `INVALID_REQUEST`    | 잘못된 요청 (만료 코드, 빈 메시지, 팀 외 채팅 시도 등)      |
| `401` | `UNAUTHORIZED`       | 인증 토큰 없음                                |
| `403` | `ACCESS_DENIED`      | 권한 없음                                   |
| `404` | `NOT_FOUND`          | 리소스 없음                                  |
| `409` | `DUPLICATE_USERNAME` | 아이디 중복                                  |
| `409` | `INVALID_STATE`      | 유효하지 않은 상태 (미소속, 중복출근, 조건 불충족 등)        |

---

## 3. 회원 API

### 3.1 회원가입

```
POST /api/members/signup
```

> 인증 불필요

#### Request

```json
{
  "username": "string",
  "password": "string",
  "role": "MANAGER | EMPLOYEE"
}
```

#### Response `200 OK`

```json
{
  "id": 1,
  "username": "tester01",
  "role": "EMPLOYEE",
  "balance": null
}
```

#### 예외 상황

| 상황     | HTTP  | 메시지                |
| ------ | ----- | ------------------ |
| 아이디 중복 | `409` | "이미 사용 중인 아이디입니다." |

---

### 3.2 로그인

```
POST /api/members/login
```

> 인증 불필요

#### Request

```json
{
  "username": "string",
  "password": "string"
}
```

#### Response `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
  "id": 1,
  "username": "tester01",
  "role": "EMPLOYEE",
  "virtualBalance": null
}
```

#### 예외 상황

| 상황      | HTTP  | 메시지                                  |
| ------- | ----- | ------------------------------------ |
| 사용자 없음  | `400` | "존재하지 않는 아이디입니다. 아이디를 다시 확인해주세요."   |
| 비밀번호 틀림 | `400` | "비밀번호가 올바르지 않습니다. 다시 확인해주세요."       |

---

### 3.3 토큰 재발급

```
POST /api/members/reissue
```

> 인증 불필요

#### Request

```json
{
  "refreshToken": "string"
}
```

#### Response `200 OK`

로그인 응답과 동일한 구조 반환

#### 예외 상황

| 상황         | HTTP  | 메시지                         |
| ---------- | ----- | --------------------------- |
| 유효하지 않은 토큰 | `400` | "유효하지 않은 refresh token입니다." |
| 존재하지 않는 토큰 | `400` | "존재하지 않는 refresh token입니다." |

---

### 3.4 초대 코드 생성

```
POST /api/members/invite-code
```

> **MANAGER 권한 필요**

#### Response `200 OK`

```json
{
  "inviteCode": "WS-A1B2-C3D4"
}
```

#### 예외 상황

| 상황           | HTTP  | 메시지            |
| ------------ | ----- | -------------- |
| 미인증          | `401` | "인증이 필요합니다."   |
| EMPLOYEE가 호출 | `403` | "접근 권한이 없습니다." |

#### 설명

* 호출한 MANAGER ID와 연결된 고유 초대 코드 생성
* 코드는 **5분 후 자동 만료**, **일회성**

---

### 3.5 초대 코드로 팀 참가

```
POST /api/members/join-team
```

> **EMPLOYEE 권한 필요**

#### Request

```json
{
  "inviteCode": "WS-A1B2-C3D4"
}
```

#### Response `200 OK`

* 바디 없음

#### 예외 상황

| 상황          | HTTP  | 메시지                      |
| ----------- | ----- | ------------------------ |
| 미인증         | `401` | "인증이 필요합니다."             |
| MANAGER가 호출 | `403` | "접근 권한이 없습니다."           |
| 코드 없음 / 만료  | `400` | "유효하지 않거나 만료된 초대 코드입니다." |

#### 설명

* 코드 검증 후 EMPLOYEE의 `managerId` 저장
* 팀 연결 완료 시 WebSocket(`TEAM_LINKED`) 전송 (`/topic/members/{employeeId}`)
* **팀 채팅방에 자동으로 참여자로 추가됨**

---

## 4. 팀 API

> 모든 팀 API는 JWT 인증 필요

### 4.1 내 팀 조회

```
GET /api/teams/my-team
```

> **EMPLOYEE 권한 필요**

#### Response `200 OK`

```json
{
  "managerId": 2,
  "managerUsername": "manager01"
}
```

#### 예외 상황

| 상황          | HTTP  | 메시지                 |
| ----------- | ----- | ------------------- |
| 미인증         | `401` | "인증이 필요합니다."        |
| MANAGER가 호출 | `403` | "접근 권한이 없습니다."      |
| 팀 미소속       | `409` | "아직 팀에 소속되지 않았습니다." |

---

### 4.2 팀 멤버 목록 조회

```
GET /api/teams/{managerId}/members
```

> **MANAGER 권한 필요**

#### Response `200 OK`

```json
[
  {
    "id": 1,
    "username": "tester01",
    "role": "EMPLOYEE",
    "virtualBalance": null
  }
]
```

#### 예외 상황

| 상황            | HTTP  | 메시지                     |
| ------------- | ----- | ----------------------- |
| 미인증           | `401` | "인증이 필요합니다."            |
| EMPLOYEE가 호출  | `403` | "접근 권한이 없습니다."          |
| 타 관리자 팀 조회 시도 | `400` | "본인 팀의 멤버만 조회할 수 있습니다." |

---

## 5. 출퇴근 API

> 모든 출퇴근 API는 JWT 인증 필요

### 5.1 업무 시작 (출근)

```
POST /api/work/clock-in
```

#### Response `200 OK`

```json
{
  "workLogId": 1,
  "memberId": 1,
  "username": "tester01",
  "workDate": "2026-05-20",
  "clockInTime": "2026-05-20T09:00:00"
}
```

#### 예외 상황

| 상황    | HTTP  | 메시지              |
| ----- | ----- | ---------------- |
| 미인증   | `401` | "인증이 필요합니다."     |
| 중복 출근 | `409` | "이미 오늘 출근하셨습니다." |

#### 설명

* 당일 중복 출근 방지
* 출근 시 `MemberStatus` → `WORKING` 으로 자동 변경
* 팀 전체에 WebSocket 브로드캐스트 (`/topic/team/{managerId}`)

---

### 5.2 업무 종료 (퇴근)

```
POST /api/work/clock-out
```

#### Response `200 OK`

```json
{
  "workLogId": 1,
  "memberId": 1,
  "username": "tester01",
  "workDate": "2026-05-20",
  "clockInTime": "2026-05-20T09:00:00",
  "clockOutTime": "2026-05-20T18:00:00"
}
```

#### 예외 상황

| 상황       | HTTP  | 메시지                  |
| -------- | ----- | -------------------- |
| 미인증      | `401` | "인증이 필요합니다."         |
| 출근 기록 없음 | `409` | "오늘 출근 기록이 없습니다."    |
| 중복 퇴근    | `409` | "이미 퇴근 처리가 완료되었습니다." |

#### 설명

* 당일 출근 기록 기반으로 퇴근 시각 기록
* 퇴근 시 `MemberStatus` → `OFFLINE` 으로 자동 변경
* 팀 전체에 WebSocket 브로드캐스트 (`/topic/team/{managerId}`)

---

## 6. 상태 API

> 모든 상태 API는 JWT 인증 필요

### 6.1 AI 상태 업데이트

```
PUT /api/status/ai
```

#### Request

```json
{
  "statusType": "WORKING | AWAY | FOCUS"
}
```

#### Response `200 OK`

```json
{
  "memberId": 1,
  "username": "tester01",
  "statusType": "AWAY",
  "updatedAt": "2026-05-20T10:30:00"
}
```

#### 예외 상황

| 상황            | HTTP  | 메시지                               |
| ------------- | ----- | --------------------------------- |
| 미인증           | `401` | "인증이 필요합니다."                      |
| MEETING 설정 시도 | `400` | "MEETING 상태는 미팅룸 입장 시 자동으로 변경됩니다." |
| OFFLINE 설정 시도 | `400` | "OFFLINE 상태는 퇴근 시 자동으로 변경됩니다."    |

---

### 6.2 수동 상태 설정

```
PUT /api/status/manual
```

#### Request

```json
{
  "statusType": "FOCUS"
}
```

#### Response `200 OK`

```json
{
  "memberId": 1,
  "username": "tester01",
  "statusType": "FOCUS",
  "updatedAt": "2026-05-20T10:35:00"
}
```

#### 예외 상황

| 상황            | HTTP  | 메시지                       |
| ------------- | ----- | ------------------------- |
| 미인증           | `401` | "인증이 필요합니다."              |
| FOCUS 외 상태 설정 | `400` | "수동 설정은 FOCUS 상태만 가능합니다." |

---

### 6.3 팀 전체 상태 조회

```
GET /api/status/team/{teamId}
```

> **MANAGER 권한 필요**

#### Response `200 OK`

```json
[
  {
    "memberId": 1,
    "username": "tester01",
    "statusType": "WORKING",
    "updatedAt": "2026-05-20T09:00:00"
  }
]
```

#### 예외 상황

| 상황           | HTTP  | 메시지                     |
| ------------ | ----- | ----------------------- |
| 미인증          | `401` | "인증이 필요합니다."            |
| EMPLOYEE가 호출 | `403` | "접근 권한이 없습니다."          |
| 타 관리자 팀 조회   | `400` | "본인 팀의 상태만 조회할 수 있습니다." |

---

## 7. 미팅룸 API

> 모든 미팅룸 API는 JWT 인증 필요

### 7.1 미팅룸 생성

```
POST /api/meetings
```

#### Request

```json
{
  "title": "스프린트 회고 회의"
}
```

#### Response `200 OK`

```json
{
  "roomId": 1,
  "title": "스프린트 회고 회의",
  "hostId": 2,
  "hostUsername": "manager01",
  "active": true,
  "participantCount": 1,
  "createdAt": "2026-05-20T10:00:00"
}
```

#### 예외 상황

| 상황              | HTTP  | 메시지                   |
| --------------- | ----- | --------------------- |
| 미인증             | `401` | "인증이 필요합니다."          |
| 진행 중인 회의방 이미 존재 | `409` | "이미 진행 중인 회의방이 있습니다." |

---

### 7.2 진행 중인 미팅룸 목록 조회

```
GET /api/meetings
```

#### Response `200 OK`

```json
[
  {
    "roomId": 1,
    "title": "스프린트 회고 회의",
    "hostId": 2,
    "hostUsername": "manager01",
    "active": true,
    "participantCount": 3,
    "createdAt": "2026-05-20T10:00:00"
  }
]
```

---

### 7.3 미팅룸 상세 조회

```
GET /api/meetings/{roomId}
```

#### Response `200 OK`

```json
{
  "roomId": 1,
  "title": "스프린트 회고 회의",
  "hostId": 2,
  "hostUsername": "manager01",
  "active": true,
  "participants": [
    {
      "memberId": 2,
      "username": "manager01",
      "requestStatus": "ACCEPTED",
      "invited": false
    }
  ],
  "createdAt": "2026-05-20T10:00:00"
}
```

#### 예외 상황

| 상황        | HTTP  | 메시지              |
| --------- | ----- | ---------------- |
| 존재하지 않는 방 | `404` | "존재하지 않는 미팅룸입니다." |

---

### 7.4 참가 요청 (사용자 → 주최자)

```
POST /api/meetings/{roomId}/join-request
```

#### Response `200 OK`

```json
{
  "participantId": 5,
  "roomId": 1,
  "memberId": 1,
  "username": "tester01",
  "requestStatus": "PENDING"
}
```

#### 예외 상황

| 상황         | HTTP  | 메시지                        |
| ---------- | ----- | -------------------------- |
| 미인증        | `401` | "인증이 필요합니다."               |
| 이미 요청/참여 중 | `409` | "이미 참가 요청하셨거나 회의에 참여 중입니다." |
| 종료된 미팅룸    | `409` | "이미 종료된 미팅룸입니다."           |

---

### 7.5 주최자 초대

```
POST /api/meetings/{roomId}/invite
```

#### Request

```json
{
  "memberId": 1
}
```

#### Response `200 OK`

```json
{
  "participantId": 6,
  "roomId": 1,
  "memberId": 1,
  "username": "tester01",
  "requestStatus": "PENDING"
}
```

#### 예외 상황

| 상황         | HTTP  | 메시지                        |
| ---------- | ----- | -------------------------- |
| 미인증        | `401` | "인증이 필요합니다."               |
| 주최자가 아닌 경우 | `400` | "주최자만 가능한 작업입니다."          |
| 이미 초대/참여 중 | `409` | "이미 참가 요청하셨거나 회의에 참여 중입니다." |

---

### 7.6 참가 요청 수락/거절 (주최자)

```
PUT /api/meetings/{roomId}/requests/{participantId}
```

#### Request

```json
{
  "accept": true
}
```

#### Response `200 OK`

```json
{
  "participantId": 5,
  "roomId": 1,
  "memberId": 1,
  "username": "tester01",
  "requestStatus": "ACCEPTED"
}
```

#### 예외 상황

| 상황         | HTTP  | 메시지               |
| ---------- | ----- | ----------------- |
| 미인증        | `401` | "인증이 필요합니다."      |
| 주최자가 아닌 경우 | `400` | "주최자만 가능한 작업입니다." |

---

### 7.7 초대 수락/거절 (초대받은 사용자)

```
PUT /api/meetings/{roomId}/invite-response
```

#### Request

```json
{
  "accept": true
}
```

#### Response `200 OK`

참가 요청 응답과 동일한 구조 반환

#### 예외 상황

| 상황        | HTTP  | 메시지               |
| --------- | ----- | ----------------- |
| 미인증       | `401` | "인증이 필요합니다."      |
| 초대 정보 없음  | `404` | "초대 정보를 찾을 수 없습니다." |
| 초대가 아닌 요청 | `400` | "초대받은 요청이 아닙니다."  |

---

### 7.8 미팅룸 종료 (주최자)

```
DELETE /api/meetings/{roomId}
```

#### Response `200 OK`

* 바디 없음

#### 예외 상황

| 상황         | HTTP  | 메시지               |
| ---------- | ----- | ----------------- |
| 미인증        | `401` | "인증이 필요합니다."      |
| 주최자가 아닌 경우 | `400` | "주최자만 가능한 작업입니다." |

---

### 7.9 회의 나가기 (참가자)

```
DELETE /api/meetings/{roomId}/leave
```

#### Response `200 OK`

* 바디 없음

#### 예외 상황

| 상황       | HTTP  | 메시지                   |
| -------- | ----- | --------------------- |
| 미인증      | `401` | "인증이 필요합니다."          |
| 참가 정보 없음 | `404` | "회의 참가 정보를 찾을 수 없습니다." |

---

## 8. 알림 API

> 모든 알림 API는 JWT 인증 필요

### 8.1 알림 발송

```
POST /api/notifications
```

> **MANAGER 권한 필요**

#### Request

```json
{
  "receiverId": 1,
  "message": "즉시 보고 바랍니다.",
  "notificationType": "IMPORTANT"
}
```

#### Response `200 OK`

```json
{
  "notificationId": 1,
  "senderId": 2,
  "senderUsername": "manager01",
  "receiverId": 1,
  "receiverUsername": "tester01",
  "message": "즉시 보고 바랍니다.",
  "notificationType": "IMPORTANT",
  "read": false,
  "createdAt": "2026-05-20T11:00:00",
  "readAt": null
}
```

#### 예외 상황

| 상황                        | HTTP  | 메시지                                         |
| ------------------------- | ----- | ------------------------------------------- |
| 미인증                       | `401` | "인증이 필요합니다."                                |
| EMPLOYEE가 호출              | `403` | "접근 권한이 없습니다."                              |
| 수신자 없음                    | `404` | "존재하지 않는 수신자입니다."                           |
| IMPORTANT — 수신자 상태 조건 불충족 | `409` | "중요 알림은 수신자가 [근무중] 또는 [회의중] 상태일 때만 발송할 수 있습니다." |

---

### 8.2 내 알림 전체 조회

```
GET /api/notifications
```

#### Response `200 OK`

```json
[
  {
    "notificationId": 1,
    "senderId": 2,
    "senderUsername": "manager01",
    "receiverId": 1,
    "receiverUsername": "tester01",
    "message": "즉시 보고 바랍니다.",
    "notificationType": "IMPORTANT",
    "read": false,
    "createdAt": "2026-05-20T11:00:00",
    "readAt": null
  }
]
```

---

### 8.3 읽지 않은 알림 조회

```
GET /api/notifications/unread
```

알림 전체 조회 응답과 동일한 구조 반환 (읽지 않은 것만 필터링)

---

### 8.4 읽지 않은 알림 수 조회

```
GET /api/notifications/unread/count
```

#### Response `200 OK`

```json
{
  "unreadCount": 3
}
```

---

### 8.5 알림 단건 읽음 처리

```
PATCH /api/notifications/{notificationId}/read
```

#### Response `200 OK`

알림 응답과 동일한 구조 반환 (`read: true`, `readAt` 채워짐)

#### 예외 상황

| 상황       | HTTP  | 메시지                     |
| -------- | ----- | ----------------------- |
| 알림 없음    | `404` | "존재하지 않는 알림입니다."        |
| 타인 알림 처리 | `400` | "본인의 알림만 읽음 처리할 수 있습니다." |

---

### 8.6 알림 전체 읽음 처리

```
PATCH /api/notifications/read-all
```

#### Response `200 OK`

* 바디 없음

---

## 9. 데일리 스탠드업 API

> 모든 스탠드업 API는 JWT 인증 필요

### 9.1 오늘의 목표 작성

```
POST /api/standup/goal
```

#### Request

```json
{
  "goal": "기획서 검토 및 API 명세 작성 완료"
}
```

#### Response `200 OK`

```json
{
  "standupId": 1,
  "memberId": 1,
  "username": "tester01",
  "standupDate": "2026-05-20",
  "goal": "기획서 검토 및 API 명세 작성 완료",
  "result": null,
  "createdAt": "2026-05-20T09:05:00",
  "updatedAt": "2026-05-20T09:05:00"
}
```

#### 설명

* 같은 날 재호출 시 덮어쓰기
* 팀 전체에 `GOAL_UPDATED` WebSocket 브로드캐스트

---

### 9.2 오늘의 결과 작성

```
POST /api/standup/result
```

#### Request

```json
{
  "result": "API 명세 작성 완료, 백엔드 코드 리뷰 진행"
}
```

#### Response `200 OK`

목표 작성 응답과 동일한 구조 반환 (`result` 필드 채워짐)

#### 예외 상황

| 상황        | HTTP  | 메시지                  |
| --------- | ----- | -------------------- |
| 목표 미작성 상태 | `409` | "오늘의 목표를 먼저 작성해주세요." |

---

### 9.3 내 오늘 스탠드업 조회

```
GET /api/standup/my
```

#### 예외 상황

| 상황       | HTTP  | 메시지                  |
| -------- | ----- | -------------------- |
| 작성 내역 없음 | `409` | "오늘 작성된 스탠드업이 없습니다." |

---

### 9.4 팀 전체 스탠드업 조회

```
GET /api/standup/team?date=2026-05-20
```

> `date` 파라미터 없으면 오늘 날짜 기준

#### Response `200 OK`

```json
{
  "standupDate": "2026-05-20",
  "standups": [
    {
      "standupId": 1,
      "memberId": 1,
      "username": "tester01",
      "standupDate": "2026-05-20",
      "goal": "기획서 검토 및 API 명세 작성 완료",
      "result": "API 명세 작성 완료",
      "createdAt": "2026-05-20T09:05:00",
      "updatedAt": "2026-05-20T18:00:00"
    }
  ]
}
```

---

## 10. 채팅 API ✨ NEW

> 모든 채팅 API는 JWT 인증 필요
>
> 채팅은 **1:1 채팅(DIRECT)** 과 **팀 전체 채팅(TEAM)** 두 종류로 구분됩니다.
> 팀 채팅방은 팀원이 `join-team` 시 자동 생성 및 참여 처리됩니다.

---

### 10.1 채팅방 목록 조회

```
GET /api/chat/rooms
```

> DIRECT + TEAM 통합 목록, 최근 메시지 기준 최신순 정렬

#### Response `200 OK`

```json
[
  {
    "roomId": 1,
    "roomType": "DIRECT",
    "otherMemberId": 2,
    "otherMemberUsername": "manager01",
    "otherMemberStatus": "WORKING",
    "roomName": null,
    "participantCount": 0,
    "lastMessage": {
      "messageId": 10,
      "roomId": 1,
      "roomType": "DIRECT",
      "senderId": 2,
      "senderUsername": "manager01",
      "content": "회의 자료 준비해주세요.",
      "messageType": "NORMAL",
      "read": false,
      "createdAt": "2026-05-28T10:30:00",
      "readAt": null
    },
    "unreadCount": 1
  },
  {
    "roomId": 2,
    "roomType": "TEAM",
    "otherMemberId": null,
    "otherMemberUsername": null,
    "otherMemberStatus": null,
    "roomName": "manager01팀 채팅",
    "participantCount": 4,
    "lastMessage": {
      "messageId": 15,
      "roomId": 2,
      "roomType": "TEAM",
      "senderId": 3,
      "senderUsername": "tester02",
      "content": "오늘 스프린트 시작합니다!",
      "messageType": "NORMAL",
      "read": false,
      "createdAt": "2026-05-28T09:00:00",
      "readAt": null
    },
    "unreadCount": 3
  }
]
```

#### 필드 설명

| 필드                   | DIRECT     | TEAM       |
| -------------------- | ---------- | ---------- |
| `otherMemberId`      | 상대방 ID     | `null`     |
| `otherMemberUsername`| 상대방 이름     | `null`     |
| `otherMemberStatus`  | 상대방 현재 상태  | `null`     |
| `roomName`           | `null`     | 팀 채팅방 이름   |
| `participantCount`   | `0`        | 참여자 수      |

---

### 10.2 1:1 채팅방 입장

```
POST /api/chat/direct/{otherMemberId}/enter
```

> 채팅방이 없으면 자동 생성, 입장 시 미읽음 메시지 일괄 읽음 처리

#### Response `200 OK`

```json
{
  "roomId": 1,
  "otherMemberId": 2,
  "otherMemberUsername": "manager01",
  "otherMemberStatus": "WORKING",
  "messages": [
    {
      "messageId": 8,
      "roomId": 1,
      "roomType": "DIRECT",
      "senderId": 2,
      "senderUsername": "manager01",
      "content": "안녕하세요!",
      "messageType": "NORMAL",
      "read": true,
      "createdAt": "2026-05-28T09:00:00",
      "readAt": "2026-05-28T09:01:00"
    }
  ]
}
```

#### 예외 상황

| 상황         | HTTP  | 메시지                      |
| ---------- | ----- | ------------------------ |
| 미인증        | `401` | "인증이 필요합니다."             |
| 존재하지 않는 상대 | `404` | "존재하지 않는 사용자입니다."        |
| 다른 팀 멤버    | `400` | "같은 팀 멤버에게만 메시지를 보낼 수 있습니다." |

#### 설명

* 메시지는 최근 50건, 오래된 순으로 반환
* 입장 시 발신자에게 `CHAT_READ` WebSocket 이벤트 발송

---

### 10.3 1:1 메시지 전송

```
POST /api/chat/rooms/{roomId}/direct/messages
```

#### Request

```json
{
  "content": "회의 자료 준비해주세요.",
  "messageType": "NORMAL"
}
```

| 필드            | 타입               | 필수 | 설명                          |
| ------------- | ---------------- | -- | --------------------------- |
| `content`     | `string`         | ✅  | 메시지 내용 (최대 2000자)           |
| `messageType` | `ChatMessageType`| ✅  | `NORMAL` 또는 `URGENT` (기본값 `NORMAL`) |

#### Response `200 OK`

```json
{
  "messageId": 11,
  "roomId": 1,
  "roomType": "DIRECT",
  "senderId": 1,
  "senderUsername": "tester01",
  "content": "회의 자료 준비해주세요.",
  "messageType": "NORMAL",
  "read": false,
  "createdAt": "2026-05-28T10:30:00",
  "readAt": null
}
```

#### 예외 상황

| 상황          | HTTP  | 메시지                      |
| ----------- | ----- | ------------------------ |
| 미인증         | `401` | "인증이 필요합니다."             |
| 존재하지 않는 방   | `404` | "존재하지 않는 채팅방입니다."        |
| 참여자가 아닌 경우  | `400` | "채팅방 참여자가 아닙니다."         |
| 빈 메시지       | `400` | "메시지 내용을 입력해주세요."        |
| 2000자 초과    | `400` | "메시지는 2000자를 초과할 수 없습니다." |

#### 설명

**알림 정책**

| 수신자 상태            | `NORMAL` 메시지          | `URGENT` 메시지           |
| ----------------- | ---------------------- | ----------------------- |
| `WORKING`         | `CHAT_MESSAGE_RECEIVED` 발송 | `CHAT_URGENT_RECEIVED` 발송 |
| `MEETING` / `AWAY`| `CHAT_MESSAGE_RECEIVED` 발송 (프론트에서 알림 미발송 처리) | `CHAT_URGENT_RECEIVED` 발송 (강제 알림) |
| `FOCUS` / `OFFLINE`| `CHAT_MESSAGE_RECEIVED` 발송 | `CHAT_URGENT_RECEIVED` 발송 |

* 수신 채널: `/topic/members/{receiverId}`

---

### 10.4 1:1 채팅창 상단 배너 조회

```
GET /api/chat/direct/{otherMemberId}/status-banner
```

> 채팅창 진입 시 상대방 상태 확인. 상태 변경은 기존 `STATUS_CHANGED` WebSocket으로 실시간 수신.

#### Response `200 OK`

```json
{
  "otherMemberId": 2,
  "otherMemberUsername": "manager01",
  "otherMemberStatus": "MEETING",
  "showBanner": true,
  "canSendUrgent": true,
  "bannerMessage": "현재 manager01님은 회의 중입니다. 알림이 울리지 않습니다."
}
```

#### 필드 설명

| 필드               | 설명                                                       |
| ---------------- | -------------------------------------------------------- |
| `showBanner`     | `true`이면 `bannerMessage`를 채팅창 상단에 표시                     |
| `canSendUrgent`  | 항상 `true` — 긴급 알림 버튼 항상 활성화                             |
| `bannerMessage`  | `showBanner`가 `false`이면 `null`                           |

#### 예외 상황

| 상황         | HTTP  | 메시지               |
| ---------- | ----- | ----------------- |
| 미인증        | `401` | "인증이 필요합니다."      |
| 존재하지 않는 상대 | `404` | "존재하지 않는 사용자입니다." |

---

### 10.5 1:1 채팅방 읽음 처리

```
POST /api/chat/rooms/{roomId}/direct/read
```

> 채팅창 포커스(활성화) 시 호출. 발신자에게 `CHAT_READ` WebSocket 이벤트 발송.

#### Response `200 OK`

* 바디 없음

#### 예외 상황

| 상황        | HTTP  | 메시지               |
| --------- | ----- | ----------------- |
| 미인증       | `401` | "인증이 필요합니다."      |
| 참여자가 아닌 경우 | `400` | "채팅방 참여자가 아닙니다."  |

---

### 10.6 팀 채팅방 입장

```
POST /api/chat/team/{roomId}/enter
```

> 입장 시 `lastReadAt` 갱신 → 미읽음 카운트 0으로 초기화

#### Response `200 OK`

```json
{
  "roomId": 2,
  "roomName": "manager01팀 채팅",
  "managerId": 2,
  "participants": [
    {
      "memberId": 2,
      "username": "manager01",
      "status": "WORKING"
    },
    {
      "memberId": 1,
      "username": "tester01",
      "status": "FOCUS"
    }
  ],
  "messages": [
    {
      "messageId": 14,
      "roomId": 2,
      "roomType": "TEAM",
      "senderId": 2,
      "senderUsername": "manager01",
      "content": "오늘 목표 공유해주세요.",
      "messageType": "NORMAL",
      "read": false,
      "createdAt": "2026-05-28T09:00:00",
      "readAt": null
    }
  ]
}
```

#### 예외 상황

| 상황          | HTTP  | 메시지               |
| ----------- | ----- | ----------------- |
| 미인증         | `401` | "인증이 필요합니다."      |
| 존재하지 않는 방   | `404` | "존재하지 않는 채팅방입니다." |
| 참여자가 아닌 경우  | `400` | "팀 채팅방 참여자가 아닙니다." |

#### 설명

* 메시지는 최근 50건, 오래된 순으로 반환
* `read` 필드는 팀 채팅에서 의미 없음 — 미읽음은 `lastReadAt` 기준으로 서버에서 집계

---

### 10.7 팀 채팅 메시지 전송

```
POST /api/chat/rooms/{roomId}/team/messages
```

#### Request

```json
{
  "content": "오늘 스프린트 시작합니다!",
  "messageType": "NORMAL"
}
```

> `URGENT` 타입은 팀 채팅에서 사용 불가

#### Response `200 OK`

```json
{
  "messageId": 16,
  "roomId": 2,
  "roomType": "TEAM",
  "senderId": 1,
  "senderUsername": "tester01",
  "content": "오늘 스프린트 시작합니다!",
  "messageType": "NORMAL",
  "read": false,
  "createdAt": "2026-05-28T10:00:00",
  "readAt": null
}
```

#### 예외 상황

| 상황         | HTTP  | 메시지                             |
| ---------- | ----- | ------------------------------- |
| 미인증        | `401` | "인증이 필요합니다."                    |
| 존재하지 않는 방  | `404` | "존재하지 않는 채팅방입니다."               |
| 참여자가 아닌 경우 | `400` | "팀 채팅방 참여자가 아닙니다."              |
| URGENT 시도  | `400` | "팀 채팅에서는 긴급 알림을 사용할 수 없습니다."    |
| 빈 메시지      | `400` | "메시지 내용을 입력해주세요."               |
| 2000자 초과   | `400` | "메시지는 2000자를 초과할 수 없습니다."       |

#### 설명

* 전송 후 팀 전체에 `TEAM_CHAT_MESSAGE` WebSocket 브로드캐스트
* 발송 채널: `/topic/team/{managerId}`

---

### 10.8 팀 채팅방 읽음 처리

```
POST /api/chat/rooms/{roomId}/team/read
```

> 채팅창 포커스(활성화) 시 호출. `lastReadAt` 갱신으로 미읽음 카운트 초기화.

#### Response `200 OK`

* 바디 없음

#### 예외 상황

| 상황        | HTTP  | 메시지               |
| --------- | ----- | ----------------- |
| 미인증       | `401` | "인증이 필요합니다."      |
| 참여자가 아닌 경우 | `400` | "팀 채팅방 참여자가 아닙니다." |

---

## 11. 웹소켓 API

### 11.1 연결 엔드포인트

```
/ws
```

### 11.2 구독 경로

| 경로                          | 설명                                          |
| --------------------------- | ------------------------------------------- |
| `/topic/team/{managerId}`   | 팀 출퇴근·상태·미팅룸·스탠드업·**팀 채팅** 실시간 브로드캐스트     |
| `/topic/members/{memberId}` | 특정 멤버 개인 알림 (초대, 요청, 알림, **1:1 채팅 메시지** 등) |

---

### 11.3 `/topic/team/{managerId}` 이벤트 목록

| event                     | 발생 시점               | 주요 페이로드 필드                              |
| ------------------------- | ------------------- | ---------------------------------------- |
| `STATUS_CHANGED`          | 출퇴근 / AI / 수동 설정 시  | `memberId, username, statusType, changedAt` |
| `ROOM_CREATED`            | 미팅룸 생성 시            | `roomId, title, hostId`                  |
| `ROOM_ENDED`              | 미팅룸 종료 시            | `roomId, title, hostId`                  |
| `MEMBER_JOINED`           | 참가자 수락 후 입장 시       | `roomId, title, hostId`                  |
| `MEMBER_LEFT`             | 참가자 나가기 시           | `roomId, title, hostId`                  |
| `GOAL_UPDATED`            | 스탠드업 목표 작성 시        | `memberId, username, date`               |
| `RESULT_UPDATED`          | 스탠드업 결과 작성 시        | `memberId, username, date`               |
| `TEAM_CHAT_MESSAGE` ✨     | 팀 채팅 메시지 전송 시       | `roomId, roomType, messageId, senderId, senderUsername, content, messageType, createdAt` |
| `TEAM_CHAT_MEMBER_JOINED` ✨| 팀원 합류 시 (참여자 목록 갱신) | `memberId, username, status`             |

---

### 11.4 `/topic/members/{memberId}` 이벤트 목록

| event                      | 발생 시점              | 주요 페이로드 필드                              |
| -------------------------- | ------------------ | ---------------------------------------- |
| `TEAM_LINKED`              | 팀 참가 완료 시          | `managerId`                              |
| `JOIN_REQUESTED`           | 누군가 미팅 참가 요청 시     | `roomId, memberId, username`             |
| `INVITED`                  | 주최자가 미팅 초대 시       | `roomId, title`                          |
| `REQUEST_ACCEPTED`         | 미팅 참가 요청 수락 시      | `roomId, title`                          |
| `REQUEST_REJECTED`         | 미팅 참가 요청 거절 시      | `roomId, title`                          |
| `NOTIFICATION_RECEIVED`    | 알림 발송 시            | `NotificationResponse` 전체 구조            |
| `CHAT_MESSAGE_RECEIVED` ✨  | 1:1 일반 메시지 수신 시    | `roomId, roomType, messageId, senderId, senderUsername, content, messageType, createdAt` |
| `CHAT_URGENT_RECEIVED` ✨   | 1:1 긴급 메시지 수신 시    | `CHAT_MESSAGE_RECEIVED`와 동일 구조 (강제 알림)  |
| `CHAT_READ` ✨              | 상대방이 내 메시지를 읽었을 때  | `roomId, readByMemberId`                 |

---

### 11.5 WebSocket 메시지 공통 Envelope

모든 WebSocket 메시지는 아래 구조로 래핑됩니다.

```json
{
  "event": "CHAT_MESSAGE_RECEIVED",
  "data": {  },
  "occurredAt": "2026-05-28T10:30:00.000Z",
  "version": "v1"
}
```

---

## 12. Enum 정의

### 12.1 Role

| 값          | 설명  |
| ---------- | --- |
| `MANAGER`  | 관리자 |
| `EMPLOYEE` | 직원  |

### 12.2 StatusType

| 값         | 설명         | 설정 주체              |
| --------- | ---------- | ------------------ |
| `WORKING` | 근무 중       | 출근 자동 / AI 판별      |
| `MEETING` | 회의 중       | 미팅룸 입장 시 자동        |
| `AWAY`    | 휴식/자리비움    | AI 판별 (5분 무입력 + 캠) |
| `FOCUS`   | 집중 (방해 금지) | AI 자동 / 사용자 수동     |
| `OFFLINE` | 오프라인       | 퇴근 자동              |

### 12.3 MeetingRequestStatus

| 값          | 설명       |
| ---------- | -------- |
| `PENDING`  | 요청/초대 대기 |
| `ACCEPTED` | 수락됨      |
| `REJECTED` | 거절됨      |

### 12.4 NotificationType

| 값           | 설명                               |
| ----------- | -------------------------------- |
| `GENERAL`   | 일반 알림 (상태 무관)                    |
| `IMPORTANT` | 중요 알림 (수신자 WORKING/MEETING 상태 필요) |

### 12.5 ChatRoomType ✨

| 값        | 설명                       |
| -------- | ------------------------ |
| `DIRECT` | 1:1 채팅 (팀 내 두 멤버)        |
| `TEAM`   | 팀 전체 채팅 (매니저 기준 팀 단위)    |

### 12.6 ChatMessageType ✨

| 값        | 설명                                          |
| -------- | --------------------------------------------- |
| `NORMAL` | 일반 메시지 — 수신자 MEETING/AWAY 시 알림 미발송           |
| `URGENT` | 긴급 메시지 — 수신자 상태 무관 강제 알림 (DIRECT 전용)         |

---

## 13. 보안 및 설정

### 13.1 Security

| 경로                                              | 인증 필요        |
| ----------------------------------------------- | ------------ |
| `POST /api/members/signup`                      | ❌            |
| `POST /api/members/login`                       | ❌            |
| `POST /api/members/reissue`                     | ❌            |
| `POST /api/members/invite-code`                 | ✅ (MANAGER)  |
| `POST /api/members/join-team`                   | ✅ (EMPLOYEE) |
| `GET /api/teams/my-team`                        | ✅ (EMPLOYEE) |
| `GET /api/teams/{id}/members`                   | ✅ (MANAGER)  |
| `POST /api/work/clock-in`                       | ✅            |
| `POST /api/work/clock-out`                      | ✅            |
| `PUT /api/status/ai`                            | ✅            |
| `PUT /api/status/manual`                        | ✅            |
| `GET /api/status/team/{id}`                     | ✅ (MANAGER)  |
| `POST /api/meetings`                            | ✅            |
| `GET /api/meetings`                             | ✅            |
| `GET /api/meetings/{roomId}`                    | ✅            |
| `POST /api/meetings/{roomId}/join-request`      | ✅            |
| `POST /api/meetings/{roomId}/invite`            | ✅            |
| `PUT /api/meetings/{roomId}/requests/{pid}`     | ✅            |
| `PUT /api/meetings/{roomId}/invite-response`    | ✅            |
| `DELETE /api/meetings/{roomId}`                 | ✅            |
| `DELETE /api/meetings/{roomId}/leave`           | ✅            |
| `POST /api/notifications`                       | ✅ (MANAGER)  |
| `GET /api/notifications`                        | ✅            |
| `GET /api/notifications/unread`                 | ✅            |
| `GET /api/notifications/unread/count`           | ✅            |
| `PATCH /api/notifications/{id}/read`            | ✅            |
| `PATCH /api/notifications/read-all`             | ✅            |
| `POST /api/standup/goal`                        | ✅            |
| `POST /api/standup/result`                      | ✅            |
| `GET /api/standup/my`                           | ✅            |
| `GET /api/standup/team`                         | ✅            |
| `GET /api/chat/rooms`                           | ✅            |
| `POST /api/chat/direct/{otherMemberId}/enter`   | ✅            |
| `POST /api/chat/rooms/{roomId}/direct/messages` | ✅            |
| `GET /api/chat/direct/{otherMemberId}/status-banner` | ✅       |
| `POST /api/chat/rooms/{roomId}/direct/read`     | ✅            |
| `POST /api/chat/team/{roomId}/enter`            | ✅            |
| `POST /api/chat/rooms/{roomId}/team/messages`   | ✅            |
| `POST /api/chat/rooms/{roomId}/team/read`       | ✅            |
| 그 외 모든 요청                                      | ✅            |

### 13.2 CORS

| 항목              | 값                                      |
| --------------- | -------------------------------------- |
| Allowed Origins | `${ALLOWED_ORIGINS}` (기본: `http://localhost:5173`) |
| Allowed Methods | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| Allowed Headers | Authorization, Content-Type, Accept    |
| Exposed Headers | Authorization                          |

---

## 14. 전체 흐름

```
# 인증 흐름
클라이언트 → POST /api/members/login → JWT 토큰 발급
클라이언트 → 이후 요청 시 Authorization: Bearer {token} 헤더 포함

# 초대 코드 흐름
MANAGER  → POST /api/members/invite-code → 코드 발급 (5분 만료, 일회성)
EMPLOYEE → POST /api/members/join-team   → 코드 입력 → 팀 매핑
서버      → WebSocket(/topic/members/{employeeId}) → TEAM_LINKED
서버      → 팀 채팅방에 EMPLOYEE 자동 참여 (없으면 채팅방도 자동 생성)
서버      → WebSocket(/topic/team/{managerId}) → TEAM_CHAT_MEMBER_JOINED

# 출퇴근 흐름
EMPLOYEE → POST /api/work/clock-in  → WorkLog 생성, MemberStatus=WORKING
서버      → WebSocket(/topic/team/{managerId}) → STATUS_CHANGED (WORKING)
EMPLOYEE → POST /api/work/clock-out → WorkLog 업데이트, MemberStatus=OFFLINE
서버      → WebSocket(/topic/team/{managerId}) → STATUS_CHANGED (OFFLINE)

# AI 상태 판별 흐름
프론트 AI → PUT /api/status/ai (WORKING / AWAY / FOCUS)
서버       → WebSocket(/topic/team/{managerId}) → STATUS_CHANGED

# 미팅룸 흐름
주최자    → POST /api/meetings              → 방 생성, 상태=MEETING
참가자    → POST /api/meetings/{id}/join-request → 주최자에게 JOIN_REQUESTED
주최자    → PUT  /api/meetings/{id}/requests/{pid} (accept:true) → 참가자 상태=MEETING
         또는
주최자    → POST /api/meetings/{id}/invite  → 대상자에게 INVITED
대상자    → PUT  /api/meetings/{id}/invite-response (accept:true) → 상태=MEETING
주최자    → DELETE /api/meetings/{id}       → 전원 상태=WORKING 복귀

# 1:1 채팅 흐름
사용자A   → POST /api/chat/direct/{B}/enter         → 채팅방 입장 (없으면 생성)
사용자A   → GET  /api/chat/direct/{B}/status-banner → 상대 상태 확인 및 배너 표시 여부
사용자A   → POST /api/chat/rooms/{id}/direct/messages (NORMAL) → 일반 메시지 전송
서버      → WebSocket(/topic/members/{B}) → CHAT_MESSAGE_RECEIVED
사용자A   → POST /api/chat/rooms/{id}/direct/messages (URGENT) → 긴급 메시지 전송
서버      → WebSocket(/topic/members/{B}) → CHAT_URGENT_RECEIVED (상태 무관 강제 알림)
사용자B   → POST /api/chat/rooms/{id}/direct/read   → 읽음 처리
서버      → WebSocket(/topic/members/{A}) → CHAT_READ

# 팀 채팅 흐름
팀원      → POST /api/chat/team/{roomId}/enter           → 팀 채팅방 입장 + 미읽음 초기화
팀원      → POST /api/chat/rooms/{roomId}/team/messages  → 팀 전체에 메시지 전송
서버      → WebSocket(/topic/team/{managerId}) → TEAM_CHAT_MESSAGE
팀원      → POST /api/chat/rooms/{roomId}/team/read      → 읽음 처리 (lastReadAt 갱신)

# 알림 흐름
MANAGER → POST /api/notifications (IMPORTANT) → 수신자 WORKING/MEETING 상태 검증
서버      → WebSocket(/topic/members/{receiverId}) → NOTIFICATION_RECEIVED

# 데일리 스탠드업 흐름
EMPLOYEE → POST /api/standup/goal   → 목표 작성
서버      → WebSocket(/topic/team/{managerId}) → GOAL_UPDATED
EMPLOYEE → POST /api/standup/result → 결과 작성
서버      → WebSocket(/topic/team/{managerId}) → RESULT_UPDATED
팀원      → GET  /api/standup/team  → 팀 전체 스탠드업 조회
```

---

## 15. 제거된 API

| 제거된 API                     | 이유                                  |
| ---------------------------- | ----------------------------------- |
| `POST /api/monitoring/event` | AI 캠 방향 변경 — 저장 대신 상태 판별로 대체        |
| `/topic/alerts`              | 출퇴근·상태 브로드캐스트(`/topic/team/`) 로 대체  |
