# WorkSight API 명세서 v3.0

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

| HTTP  | code                 | 설명                            |
| ----- | -------------------- | ----------------------------- |
| `400` | `INVALID_REQUEST`    | 잘못된 요청 (만료 코드 등)              |
| `401` | `UNAUTHORIZED`       | 인증 토큰 없음                      |
| `403` | `ACCESS_DENIED`      | 권한 없음                         |
| `404` | `NOT_FOUND`          | 리소스 없음                        |
| `409` | `DUPLICATE_USERNAME` | 아이디 중복                        |
| `409` | `INVALID_STATE`      | 유효하지 않은 상태 (미소속, 중복출근, 조건 불충족 등) |

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

| 상황      | HTTP  | 메시지                                |
| ------- | ----- | ---------------------------------- |
| 사용자 없음  | `400` | "존재하지 않는 아이디입니다. 아이디를 다시 확인해주세요." |
| 비밀번호 틀림 | `400` | "비밀번호가 올바르지 않습니다. 다시 확인해주세요."     |

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
* 팀 연결 완료 시 WebSocket(`TEAM_LINKED`) 전송

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

> 프론트엔드 AI 캠 분석 결과를 서버로 전송 (영상 저장 없이 상태 판별만 사용)

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

| 상황            | HTTP  | 메시지                          |
| ------------- | ----- | ---------------------------- |
| 미인증           | `401` | "인증이 필요합니다."                 |
| MEETING 설정 시도 | `400` | "MEETING 상태는 미팅룸 입장 시 자동으로 변경됩니다." |
| OFFLINE 설정 시도 | `400` | "OFFLINE 상태는 퇴근 시 자동으로 변경됩니다." |

#### 설명

* AI가 판별 가능한 상태: `WORKING` / `AWAY` / `FOCUS`
* `AWAY`: 키보드·마우스 5분 무입력 + 캠으로 자리비움 판별
* `FOCUS`: 시선 80% 이상 모니터 고정 + 상체 기울기 10분 유지
* `MEETING`은 미팅룸 입장 시 자동, `OFFLINE`은 퇴근 시 자동이므로 AI 경로 불가
* 상태 변경 시 팀 전체에 WebSocket 브로드캐스트

---

### 6.2 수동 상태 설정

```
PUT /api/status/manual
```

> 사용자가 직접 [집중] 상태 설정

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

| 상황           | HTTP  | 메시지                       |
| ------------ | ----- | ------------------------- |
| 미인증          | `401` | "인증이 필요합니다."              |
| FOCUS 외 상태 설정 | `400` | "수동 설정은 FOCUS 상태만 가능합니다." |

---

### 6.3 팀 전체 상태 조회

```
GET /api/status/team/{managerId}
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
  },
  {
    "memberId": 3,
    "username": "tester02",
    "statusType": "FOCUS",
    "updatedAt": "2026-05-20T10:35:00"
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

| 상황              | HTTP  | 메시지                  |
| --------------- | ----- | -------------------- |
| 미인증             | `401` | "인증이 필요합니다."         |
| 진행 중인 회의방 이미 존재 | `409` | "이미 진행 중인 회의방이 있습니다." |

#### 설명

* 생성 시 주최자 상태 → `MEETING` 자동 변경
* 팀 전체에 `ROOM_CREATED` WebSocket 브로드캐스트

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

| 상황        | HTTP  | 메시지             |
| --------- | ----- | --------------- |
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

| 상황          | HTTP  | 메시지                        |
| ----------- | ----- | -------------------------- |
| 미인증         | `401` | "인증이 필요합니다."               |
| 이미 요청/참여 중  | `409` | "이미 참가 요청하셨거나 회의에 참여 중입니다." |
| 종료된 미팅룸     | `409` | "이미 종료된 미팅룸입니다."           |

#### 설명

* 주최자에게 `JOIN_REQUESTED` WebSocket 알림 전송 (`/topic/members/{hostId}`)

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

#### 설명

* 초대 대상에게 `INVITED` WebSocket 알림 전송 (`/topic/members/{memberId}`)

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

#### 설명

* 수락 시 해당 멤버 상태 → `MEETING` 자동 변경
* 수락 시 `REQUEST_ACCEPTED`, 거절 시 `REQUEST_REJECTED` WebSocket 알림

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

| 상황           | HTTP  | 메시지               |
| ------------ | ----- | ----------------- |
| 미인증          | `401` | "인증이 필요합니다."      |
| 초대 정보 없음     | `404` | "초대 정보를 찾을 수 없습니다." |
| 초대가 아닌 요청    | `400` | "초대받은 요청이 아닙니다."  |

#### 설명

* 수락 시 본인 상태 → `MEETING` 자동 변경
* 수락 시 팀 전체에 `MEMBER_JOINED` 브로드캐스트

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

#### 설명

* 수락된 모든 참가자 상태 → `WORKING` 자동 복귀
* 팀 전체에 `ROOM_ENDED` WebSocket 브로드캐스트

---

### 7.9 회의 나가기 (참가자)

```
DELETE /api/meetings/{roomId}/leave
```

#### Response `200 OK`

* 바디 없음

#### 예외 상황

| 상황       | HTTP  | 메시지                  |
| -------- | ----- | -------------------- |
| 미인증      | `401` | "인증이 필요합니다."         |
| 참가 정보 없음 | `404` | "회의 참가 정보를 찾을 수 없습니다." |

#### 설명

* 나간 참가자 상태 → `WORKING` 자동 복귀
* 팀 전체에 `MEMBER_LEFT` WebSocket 브로드캐스트

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

| 상황                          | HTTP  | 메시지                                      |
| --------------------------- | ----- | ---------------------------------------- |
| 미인증                         | `401` | "인증이 필요합니다."                             |
| EMPLOYEE가 호출                | `403` | "접근 권한이 없습니다."                           |
| 수신자 없음                      | `404` | "존재하지 않는 수신자입니다."                        |
| IMPORTANT — 수신자 상태 조건 불충족   | `409` | "중요 알림은 수신자가 [근무중] 또는 [회의중] 상태일 때만 발송할 수 있습니다." |

#### 설명

* `IMPORTANT` 알림: 수신자가 `WORKING` 또는 `MEETING` 상태일 때만 발송 가능
* `GENERAL` 알림: 상태 무관 항상 발송
* 발송 후 수신자에게 WebSocket 실시간 푸시 (`/topic/members/{receiverId}`)

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

#### Response `200 OK`

알림 전체 조회 응답과 동일한 구조 반환 (읽지 않은 것만 필터링)

---

### 8.4 읽지 않은 알림 수 조회

```
GET /api/notifications/unread/count
```

> 프론트 뱃지 표시용

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

| 상황        | HTTP  | 메시지                    |
| --------- | ----- | ---------------------- |
| 알림 없음     | `404` | "존재하지 않는 알림입니다."       |
| 타인 알림 처리  | `400` | "본인의 알림만 읽음 처리할 수 있습니다." |

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

> 하루 시작 시 작성 — 같은 날 재호출 시 덮어쓰기

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

#### 예외 상황

| 상황  | HTTP  | 메시지          |
| --- | ----- | ------------ |
| 미인증 | `401` | "인증이 필요합니다." |

#### 설명

* 팀 전체에 `GOAL_UPDATED` WebSocket 브로드캐스트

---

### 9.2 오늘의 결과 작성

```
POST /api/standup/result
```

> 하루 끝 시 작성 — 목표가 먼저 작성되어 있어야 함

#### Request

```json
{
  "result": "API 명세 작성 완료, 백엔드 코드 리뷰 진행"
}
```

#### Response `200 OK`

목표 작성 응답과 동일한 구조 반환 (`result` 필드 채워짐)

#### 예외 상황

| 상황          | HTTP  | 메시지                  |
| ----------- | ----- | -------------------- |
| 미인증         | `401` | "인증이 필요합니다."         |
| 목표 미작성 상태   | `409` | "오늘의 목표를 먼저 작성해주세요." |

#### 설명

* 팀 전체에 `RESULT_UPDATED` WebSocket 브로드캐스트

---

### 9.3 내 오늘 스탠드업 조회

```
GET /api/standup/my
```

#### Response `200 OK`

목표 작성 응답과 동일한 구조 반환

#### 예외 상황

| 상황        | HTTP  | 메시지                  |
| --------- | ----- | -------------------- |
| 미인증       | `401` | "인증이 필요합니다."         |
| 작성 내역 없음  | `409` | "오늘 작성된 스탠드업이 없습니다." |

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
      "result": "API 명세 작성 완료, 백엔드 코드 리뷰 진행",
      "createdAt": "2026-05-20T09:05:00",
      "updatedAt": "2026-05-20T18:00:00"
    }
  ]
}
```

#### 예외 상황

| 상황  | HTTP  | 메시지          |
| --- | ----- | ------------ |
| 미인증 | `401` | "인증이 필요합니다." |

---

## 10. 웹소켓 API

### 10.1 연결 엔드포인트

```
/ws
```

### 10.2 구독 경로

| 경로                          | 설명                              |
| --------------------------- | ------------------------------- |
| `/topic/team/{managerId}`   | 팀 출퇴근·상태·미팅룸·스탠드업 변경 실시간 브로드캐스트 |
| `/topic/members/{memberId}` | 특정 멤버 개인 알림 (초대, 요청, 알림 등)      |

### 10.3 수신 데이터

#### `/topic/team/{managerId}` 이벤트 목록

| type             | 발생 시점              | 주요 필드                              |
| ---------------- | ------------------ | ---------------------------------- |
| 상태 변경 (구조체)      | 출퇴근 / AI / 수동 설정 시 | `memberId, username, statusType, changedAt` |
| `ROOM_CREATED`   | 미팅룸 생성 시           | `roomId, title, hostId`            |
| `ROOM_ENDED`     | 미팅룸 종료 시           | `roomId, title, hostId`            |
| `MEMBER_JOINED`  | 참가자 수락 후 입장 시      | `roomId, title, hostId`            |
| `MEMBER_LEFT`    | 참가자 나가기 시          | `roomId, title, hostId`            |
| `GOAL_UPDATED`   | 스탠드업 목표 작성 시       | `memberId, username, date`         |
| `RESULT_UPDATED` | 스탠드업 결과 작성 시       | `memberId, username, date`         |

#### `/topic/members/{memberId}` 이벤트 목록

| type               | 발생 시점        | 주요 필드                          |
| ------------------ | ------------ | ------------------------------ |
| `TEAM_LINKED`      | 팀 참가 완료 시    | `managerId`                    |
| `JOIN_REQUESTED`   | 누군가 참가 요청 시  | `roomId, memberId, username`   |
| `INVITED`          | 주최자가 초대 시    | `roomId, title`                |
| `REQUEST_ACCEPTED` | 참가 요청 수락 시   | `roomId, title`                |
| `REQUEST_REJECTED` | 참가 요청 거절 시   | `roomId, title`                |
| 알림 (구조체)           | 알림 발송 시      | `NotificationResponse` 전체 구조   |

---

## 11. Enum 정의

### 11.1 Role

| 값          | 설명  |
| ---------- | --- |
| `MANAGER`  | 관리자 |
| `EMPLOYEE` | 직원  |

### 11.2 StatusType

| 값         | 설명         | 설정 주체              |
| --------- | ---------- | ------------------ |
| `WORKING` | 근무 중       | 출근 자동 / AI 판별      |
| `MEETING` | 회의 중       | 미팅룸 입장 시 자동        |
| `AWAY`    | 휴식/자리비움    | AI 판별 (5분 무입력 + 캠) |
| `FOCUS`   | 집중 (방해 금지) | AI 자동 판별 / 사용자 수동  |
| `OFFLINE` | 오프라인       | 퇴근 자동              |

### 11.3 MeetingRequestStatus

| 값          | 설명       |
| ---------- | -------- |
| `PENDING`  | 요청/초대 대기 |
| `ACCEPTED` | 수락됨      |
| `REJECTED` | 거절됨      |

### 11.4 NotificationType

| 값           | 설명                               |
| ----------- | -------------------------------- |
| `GENERAL`   | 일반 알림 (상태 무관)                    |
| `IMPORTANT` | 중요 알림 (수신자 WORKING/MEETING 상태 필요) |

---

## 12. 보안 및 설정

### 12.1 Security

| 경로                                           | 인증 필요        |
| -------------------------------------------- | ------------ |
| `POST /api/members/signup`                   | ❌            |
| `POST /api/members/login`                    | ❌            |
| `POST /api/members/reissue`                  | ❌            |
| `POST /api/members/invite-code`              | ✅ (MANAGER)  |
| `POST /api/members/join-team`                | ✅ (EMPLOYEE) |
| `GET /api/teams/my-team`                     | ✅ (EMPLOYEE) |
| `GET /api/teams/{id}/members`                | ✅ (MANAGER)  |
| `POST /api/work/clock-in`                    | ✅            |
| `POST /api/work/clock-out`                   | ✅            |
| `PUT /api/status/ai`                         | ✅            |
| `PUT /api/status/manual`                     | ✅            |
| `GET /api/status/team/{id}`                  | ✅ (MANAGER)  |
| `POST /api/meetings`                         | ✅            |
| `GET /api/meetings`                          | ✅            |
| `GET /api/meetings/{roomId}`                 | ✅            |
| `POST /api/meetings/{roomId}/join-request`   | ✅            |
| `POST /api/meetings/{roomId}/invite`         | ✅            |
| `PUT /api/meetings/{roomId}/requests/{pid}`  | ✅            |
| `PUT /api/meetings/{roomId}/invite-response` | ✅            |
| `DELETE /api/meetings/{roomId}`              | ✅            |
| `DELETE /api/meetings/{roomId}/leave`        | ✅            |
| `POST /api/notifications`                    | ✅ (MANAGER)  |
| `GET /api/notifications`                     | ✅            |
| `GET /api/notifications/unread`              | ✅            |
| `GET /api/notifications/unread/count`        | ✅            |
| `PATCH /api/notifications/{id}/read`         | ✅            |
| `PATCH /api/notifications/read-all`          | ✅            |
| `POST /api/standup/goal`                     | ✅            |
| `POST /api/standup/result`                   | ✅            |
| `GET /api/standup/my`                        | ✅            |
| `GET /api/standup/team`                      | ✅            |
| 그 외 모든 요청                                   | ✅            |

### 12.2 CORS

| 항목              | 값                                      |
| --------------- | -------------------------------------- |
| Allowed Origins | `http://localhost:5173`                |
| Allowed Methods | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| Allowed Headers | Authorization, Content-Type, Accept    |
| Exposed Headers | Authorization                          |

---

## 13. 전체 흐름

```
# 인증 흐름
클라이언트 → POST /api/members/login → JWT 토큰 발급
클라이언트 → 이후 요청 시 Authorization: Bearer {token} 헤더 포함

# 초대 코드 흐름
MANAGER  → POST /api/members/invite-code → 코드 발급 (5분 만료, 일회성)
EMPLOYEE → POST /api/members/join-team   → 코드 입력 → 팀 매핑
서버      → WebSocket(/topic/members/{employeeId}) → TEAM_LINKED

# 출퇴근 흐름
EMPLOYEE → POST /api/work/clock-in  → WorkLog 생성, MemberStatus=WORKING
서버      → WebSocket(/topic/team/{managerId}) → WORKING 브로드캐스트
EMPLOYEE → POST /api/work/clock-out → WorkLog 업데이트, MemberStatus=OFFLINE
서버      → WebSocket(/topic/team/{managerId}) → OFFLINE 브로드캐스트

# AI 상태 판별 흐름
프론트 AI → PUT /api/status/ai (WORKING / AWAY / FOCUS)
서버       → WebSocket(/topic/team/{managerId}) → 상태 브로드캐스트

# 수동 집중 설정 흐름
EMPLOYEE → PUT /api/status/manual → MemberStatus=FOCUS
서버      → WebSocket(/topic/team/{managerId}) → FOCUS 브로드캐스트

# 미팅룸 흐름
주최자    → POST /api/meetings              → 방 생성, 상태=MEETING
참가자    → POST /api/meetings/{id}/join-request → 주최자에게 JOIN_REQUESTED
주최자    → PUT  /api/meetings/{id}/requests/{pid} (accept:true) → 참가자 상태=MEETING
         또는
주최자    → POST /api/meetings/{id}/invite  → 대상자에게 INVITED
대상자    → PUT  /api/meetings/{id}/invite-response (accept:true) → 상태=MEETING
주최자    → DELETE /api/meetings/{id}       → 전원 상태=WORKING 복귀

# 알림 흐름
MANAGER → POST /api/notifications (IMPORTANT) → 수신자 WORKING/MEETING 상태 검증
서버      → WebSocket(/topic/members/{receiverId}) → 실시간 푸시

# 데일리 스탠드업 흐름
EMPLOYEE → POST /api/standup/goal   → 목표 작성
EMPLOYEE → POST /api/standup/result → 결과 작성
팀원      → GET  /api/standup/team  → 팀 전체 스탠드업 조회
```

---

## 14. 제거된 API (v1.0 → v3.0)

| 제거된 API                    | 이유                                 |
| --------------------------- | ---------------------------------- |
| `POST /api/monitoring/event` | AI 캠 방향 변경 — 저장 대신 상태 판별로 대체       |
| `/topic/alerts`              | 출퇴근·상태 브로드캐스트(`/topic/team/`) 로 대체 |