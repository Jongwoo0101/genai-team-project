# WorkSight API 명세서

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

| HTTP  | code                 | 설명                       |
| ----- | -------------------- | ------------------------ |
| `400` | `INVALID_REQUEST`    | 잘못된 요청 (만료 코드 등)         |
| `401` | `UNAUTHORIZED`       | 인증 토큰 없음                 |
| `403` | `ACCESS_DENIED`      | 권한 없음                    |
| `404` | `NOT_FOUND`          | 리소스 없음                   |
| `409` | `DUPLICATE_USERNAME` | 아이디 중복                   |
| `409` | `INVALID_STATE`      | 유효하지 않은 상태 (미소속, 중복출근 등) |

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

| 상황     | HTTP  | 메시지                |
| ------ | ----- | ------------------ |
| 미인증    | `401` | "인증이 필요합니다."       |
| 중복 출근  | `409` | "이미 오늘 출근하셨습니다."   |

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

> 프론트엔드 AI 캠 분석 결과를 서버로 전송 (저장 없이 상태 판별만 사용)

#### Request

```json
{
  "statusType": "WORKING | MEETING | BREAK"
}
```

#### Response `200 OK`

```json
{
  "memberId": 1,
  "username": "tester01",
  "statusType": "MEETING",
  "updatedAt": "2026-05-20T10:30:00"
}
```

#### 예외 상황

| 상황             | HTTP  | 메시지                         |
| -------------- | ----- | --------------------------- |
| 미인증            | `401` | "인증이 필요합니다."                |
| FOCUS 설정 시도    | `400` | "AI는 FOCUS 상태를 설정할 수 없습니다." |
| OFFLINE 설정 시도  | `400` | "AI는 OFFLINE 상태를 설정할 수 없습니다." |

#### 설명

* AI가 판별한 상태(`WORKING` / `MEETING` / `BREAK`)만 허용
* `FOCUS`는 사용자 수동 설정 전용, `OFFLINE`은 퇴근 자동 전용이므로 AI 경로 불가
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

## 7. 웹소켓 API

### 7.1 연결 엔드포인트

```
/ws
```

> (구 `/ws-monitoring` 에서 변경)

### 7.2 구독 경로

| 경로                          | 설명                     |
| --------------------------- | ---------------------- |
| `/topic/team/{managerId}`   | 팀 출퇴근·상태 변경 실시간 브로드캐스트 |
| `/topic/members/{memberId}` | 특정 직원 대상 알림 (팀 연결 등)   |

### 7.3 수신 데이터

#### `/topic/team/{managerId}` — 출퇴근 / 상태 변경

```json
{
  "memberId": 1,
  "username": "tester01",
  "statusType": "WORKING",
  "changedAt": "2026-05-20T09:00:00"
}
```

| statusType | 발생 시점         |
| ---------- | ------------- |
| `WORKING`  | 출근 클릭 시       |
| `OFFLINE`  | 퇴근 클릭 시       |
| `MEETING`  | AI 판별 결과 전송 시 |
| `BREAK`    | AI 판별 결과 전송 시 |
| `FOCUS`    | 사용자 수동 설정 시   |

#### `/topic/members/{memberId}` — 팀 연결 완료

```json
{
  "type": "TEAM_LINKED",
  "managerId": 2
}
```

---

## 8. Enum 정의

### 8.1 Role

| 값          | 설명  |
| ---------- | --- |
| `MANAGER`  | 관리자 |
| `EMPLOYEE` | 직원  |

### 8.2 StatusType

| 값         | 설명         | 설정 주체      |
| --------- | ---------- | ---------- |
| `WORKING` | 근무 중       | AI 판별 / 출근 |
| `MEETING` | 회의 중       | AI 판별      |
| `BREAK`   | 휴식 중       | AI 판별      |
| `FOCUS`   | 집중 (방해 금지) | 사용자 수동     |
| `OFFLINE` | 오프라인       | 퇴근 자동      |

---

## 9. 보안 및 설정

### 9.1 Security

| 경로                              | 인증 필요        |
| ------------------------------- | ------------ |
| `POST /api/members/signup`      | ❌            |
| `POST /api/members/login`       | ❌            |
| `POST /api/members/reissue`     | ❌            |
| `POST /api/members/invite-code` | ✅ (MANAGER)  |
| `POST /api/members/join-team`   | ✅ (EMPLOYEE) |
| `GET /api/teams/my-team`        | ✅ (EMPLOYEE) |
| `GET /api/teams/{id}/members`   | ✅ (MANAGER)  |
| `POST /api/work/clock-in`       | ✅            |
| `POST /api/work/clock-out`      | ✅            |
| `PUT /api/status/ai`            | ✅            |
| `PUT /api/status/manual`        | ✅            |
| `GET /api/status/team/{id}`     | ✅ (MANAGER)  |
| 그 외 모든 요청                       | ✅            |

### 9.2 CORS

| 항목              | 값                                      |
| --------------- | -------------------------------------- |
| Allowed Origins | `http://localhost:5173`                |
| Allowed Methods | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| Allowed Headers | Authorization, Content-Type, Accept    |
| Exposed Headers | Authorization                          |

---

## 10. 전체 흐름

```
# 인증 흐름
클라이언트 → POST /api/members/login → JWT 토큰 발급
클라이언트 → 이후 요청 시 Authorization: Bearer {token} 헤더 포함

# 초대 코드 흐름
MANAGER  → POST /api/members/invite-code → 코드 발급 (5분 만료, 일회성)
EMPLOYEE → POST /api/members/join-team   → 코드 입력 → 팀 매핑
서버      → WebSocket(/topic/members/{employeeId}) → TEAM_LINKED 이벤트

# 출퇴근 흐름
EMPLOYEE → POST /api/work/clock-in  → WorkLog 생성, MemberStatus=WORKING
서버      → WebSocket(/topic/team/{managerId}) → WORKING 브로드캐스트
EMPLOYEE → POST /api/work/clock-out → WorkLog 업데이트, MemberStatus=OFFLINE
서버      → WebSocket(/topic/team/{managerId}) → OFFLINE 브로드캐스트

# AI 상태 판별 흐름 (캠 저장 없이 상태 판별만)
프론트 AI → PUT /api/status/ai  → MemberStatus 업데이트 (WORKING/MEETING/BREAK)
서버       → WebSocket(/topic/team/{managerId}) → 상태 브로드캐스트

# 수동 집중 설정 흐름
EMPLOYEE → PUT /api/status/manual → MemberStatus=FOCUS
서버      → WebSocket(/topic/team/{managerId}) → FOCUS 브로드캐스트

# 팀 상태 조회 흐름
MANAGER → GET /api/status/team/{managerId} → 팀원 전체 현재 상태 조회
```

---

## 11. 제거된 API (v1.0 → v2.0)

| 제거된 API                     | 이유                                    |
| ----------------------------- | ------------------------------------- |
| `POST /api/monitoring/event`  | AI 캠 방향 변경 — 저장 대신 상태 판별로 대체          |
| `/topic/alerts`               | 출퇴근·상태 브로드캐스트(`/topic/team/`) 로 대체    |