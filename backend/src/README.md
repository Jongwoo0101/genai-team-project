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

모든 에러는 아래 형식으로 반환됩니다.

```json
{
  "status": 400,
  "code": "INVALID_REQUEST",
  "message": "에러 내용",
  "timestamp": "2026-05-08T10:00:00"
}
```

| HTTP  | code                 | 설명                  |
| ----- | -------------------- | ------------------- |
| `400` | `INVALID_REQUEST`    | 잘못된 요청 (만료 코드 등)    |
| `401` | `UNAUTHORIZED`       | 인증 토큰 없음            |
| `403` | `ACCESS_DENIED`      | 권한 없음               |
| `404` | `NOT_FOUND`          | 리소스 없음              |
| `409` | `DUPLICATE_USERNAME` | 아이디 중복              |
| `409` | `INVALID_STATE`      | 유효하지 않은 상태 (미소속 등)  |

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

#### 필드 설명

| 필드       | 타입     | 설명                                |
| -------- | ------ | --------------------------------- |
| username | String | 사용자 아이디 (중복 불가)                   |
| password | String | 비밀번호 (서버에서 BCrypt 암호화됨)           |
| role     | Enum   | 사용자 권한 (`MANAGER` / `EMPLOYEE`)   |

#### Response `200 OK`

```json
{
  "id": 1,
  "username": "test",
  "role": "EMPLOYEE",
  "balance": 10000
}
```

#### 예외 상황

| 상황      | HTTP  | 메시지                |
| ------- | ----- | ------------------ |
| 아이디 중복  | `409` | "이미 사용 중인 아이디입니다." |

#### 설명

* 회원 생성 후 DB 저장
* 가입 시 `balance` 기본값 10,000 지급
* 만료된 토큰이 Authorization 헤더에 포함되어 있어도 정상 처리됨

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
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "id": 1,
  "username": "test",
  "role": "EMPLOYEE",
  "virtualBalance": 10000
}
```

#### 필드 설명

| 필드             | 타입     | 설명                  |
| -------------- | ------ | ------------------- |
| token          | String | JWT 액세스 토큰 (24시간 유효) |
| refreshToken   | String | JWT 리프레시 토큰         |
| id             | Long   | 회원 고유 ID            |
| username       | String | 사용자 아이디             |
| role           | Enum   | 사용자 권한              |
| virtualBalance | Long   | 가상 머니 잔액            |

#### 예외 상황

| 상황       | HTTP  | 메시지                                |
| -------- | ----- | ---------------------------------- |
| 사용자 없음   | `400` | "존재하지 않는 아이디입니다. 아이디를 다시 확인해주세요." |
| 비밀번호 틀림  | `400` | "비밀번호가 올바르지 않습니다. 다시 확인해주세요."     |

#### 설명

* 로그인 성공 시 액세스 토큰·리프레시 토큰과 유저 정보를 함께 반환
* 이후 모든 요청에 `Authorization: Bearer {token}` 헤더 포함 필요

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

| 상황          | HTTP  | 메시지                               |
| ----------- | ----- | --------------------------------- |
| 유효하지 않은 토큰  | `400` | "유효하지 않은 refresh token입니다."       |
| 만료된 토큰      | `400` | "만료된 refresh token입니다. 다시 로그인해주세요." |
| 존재하지 않는 토큰  | `400` | "존재하지 않는 refresh token입니다."       |

---

### 3.4 초대 코드 생성

```
POST /api/members/invite-code
```

> **MANAGER 권한 필요**

#### Request

* 바디 없음

#### Response `200 OK`

```json
{
  "inviteCode": "WS-A1B2-C3D4"
}
```

#### 필드 설명

| 필드         | 타입     | 설명                            |
| ---------- | ------ | ----------------------------- |
| inviteCode | String | 생성된 초대 코드 (`WS-XXXX-XXXX` 형식) |

#### 예외 상황

| 상황            | HTTP  | 메시지            |
| ------------- | ----- | -------------- |
| 미인증           | `401` | "인증이 필요합니다."   |
| EMPLOYEE가 호출  | `403` | "접근 권한이 없습니다." |

#### 설명

* 호출한 MANAGER의 ID와 연결된 고유 초대 코드 생성
* 코드는 **5분 후 자동 만료**
* 코드는 **일회성** — 사용 즉시 무효화

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

#### 필드 설명

| 필드         | 타입     | 설명               |
| ---------- | ------ | ---------------- |
| inviteCode | String | MANAGER가 발급한 초대 코드 |

#### Response `200 OK`

* 바디 없음

#### 예외 상황

| 상황           | HTTP  | 메시지                      |
| ------------ | ----- | ------------------------ |
| 미인증          | `401` | "인증이 필요합니다."             |
| MANAGER가 호출  | `403` | "접근 권한이 없습니다."           |
| 코드 없음 / 만료   | `400` | "유효하지 않거나 만료된 초대 코드입니다." |

#### 설명

* 입력한 코드를 검증 후 EMPLOYEE의 `managerId` 필드에 해당 MANAGER ID 저장
* 코드 사용 후 즉시 무효화
* 팀 연결 완료 시 해당 EMPLOYEE에게 WebSocket 이벤트(`TEAM_LINKED`) 전송

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

#### 필드 설명

| 필드              | 타입     | 설명          |
| --------------- | ------ | ----------- |
| managerId       | Long   | 관리자 고유 ID   |
| managerUsername | String | 관리자 아이디     |

#### 예외 상황

| 상황           | HTTP  | 메시지                  |
| ------------ | ----- | -------------------- |
| 미인증          | `401` | "인증이 필요합니다."         |
| MANAGER가 호출  | `403` | "접근 권한이 없습니다."       |
| 팀 미소속        | `409` | "아직 팀에 소속되지 않았습니다."  |

---

### 4.2 팀 멤버 목록 조회

```
GET /api/teams/{managerId}/members
```

> **MANAGER 권한 필요**

#### Path Variable

| 파라미터      | 타입   | 설명        |
| --------- | ---- | --------- |
| managerId | Long | 관리자 고유 ID |

#### Response `200 OK`

```json
[
  {
    "id": 1,
    "username": "tester01",
    "role": "EMPLOYEE",
    "virtualBalance": 10000
  }
]
```

#### 필드 설명

| 필드             | 타입     | 설명       |
| -------------- | ------ | -------- |
| id             | Long   | 직원 고유 ID |
| username       | String | 직원 아이디   |
| role           | Enum   | 사용자 권한   |
| virtualBalance | Long   | 가상 머니 잔액 |

#### 예외 상황

| 상황              | HTTP  | 메시지                   |
| --------------- | ----- | --------------------- |
| 미인증             | `401` | "인증이 필요합니다."          |
| EMPLOYEE가 호출    | `403` | "접근 권한이 없습니다."        |
| 타 관리자 팀 조회 시도   | `400` | "본인 팀의 멤버만 조회할 수 있습니다." |

---

## 5. 모니터링 API

> 모든 모니터링 API는 JWT 인증 필요

### 5.1 이벤트 전송

```
POST /api/monitoring/event
```

#### Request

```json
{
  "employeeId": 1,
  "eventType": "SLEEP | AWAY | NORMAL"
}
```

#### 필드 설명

| 필드         | 타입   | 설명     |
| ---------- | ---- | ------ |
| employeeId | Long | 직원 ID  |
| eventType  | Enum | 감지된 상태 |

#### 처리 로직

* `NORMAL` → 무시 (DB 저장 X)
* 그 외 → DB 저장 및 웹소켓 알림 전송

#### Response `200 OK`

```json
"Event processed successfully"
```

#### 예외 상황

| 상황             | HTTP  | 메시지              |
| -------------- | ----- | ---------------- |
| 존재하지 않는 직원 ID  | `404` | "존재하지 않는 직원입니다." |

#### 설명

1. 직원 조회
2. 비정상 상태일 경우 이벤트 저장
3. 웹소켓으로 관리자에게 실시간 알림 전송

---

## 6. 웹소켓 API

### 6.1 연결 엔드포인트

```
/ws-monitoring
```

### 6.2 구독 경로

| 경로                          | 설명                   |
| --------------------------- | -------------------- |
| `/topic/alerts`             | 관리자 대시보드 실시간 이벤트 알림  |
| `/topic/members/{memberId}` | 특정 직원 대상 팀 연결 알림     |

### 6.3 수신 데이터

#### `/topic/alerts` — 이상 상태 알림

```json
{
  "eventId": 10,
  "employeeId": 1,
  "employeeName": "test",
  "eventType": "SLEEP",
  "eventTime": "2026-04-29T21:00:00"
}
```

#### `/topic/members/{memberId}` — 팀 연결 완료 알림

```json
{
  "type": "TEAM_LINKED",
  "managerId": 2
}
```

#### 설명

* AI 모듈이 이벤트를 전송하면 서버가 관리자에게 실시간으로 `/topic/alerts` 알림 전달
* EMPLOYEE가 초대 코드로 팀에 참가하면 해당 직원에게 `/topic/members/{memberId}`로 `TEAM_LINKED` 이벤트 전달

---

## 7. Enum 정의

### 7.1 Role

| 값          | 설명  |
| ---------- | --- |
| `MANAGER`  | 관리자 |
| `EMPLOYEE` | 직원  |

### 7.2 EventType

| 값            | 설명 |
|--------------|  |
| `NORMAL`     | 정상 |
| `SLEEP`      | 졸음 |
| `AWAY`       | 자리비움 |
| `SMARTPHONE` | 스마트폰 사용 |
| `DISTRACTED`| 딴짓 |

---

## 8. 보안 및 설정

### 8.1 Security

* CSRF 비활성화
* JWT Stateless 인증 적용
* 미인증 요청 → `401 UNAUTHORIZED`
* 권한 부족 요청 → `403 ACCESS_DENIED`
* 만료/무효 토큰이 헤더에 포함되어도 인증 없이 안전하게 통과 처리

| 경로                              | 인증 필요        |
| ------------------------------- | ------------ |
| `POST /api/members/signup`      | ❌            |
| `POST /api/members/login`       | ❌            |
| `POST /api/members/reissue`     | ❌            |
| `POST /api/members/invite-code` | ✅ (MANAGER)  |
| `POST /api/members/join-team`   | ✅ (EMPLOYEE) |
| `GET /api/teams/my-team`        | ✅ (EMPLOYEE) |
| `GET /api/teams/{id}/members`   | ✅ (MANAGER)  |
| 그 외 모든 요청                       | ✅            |

### 8.2 CORS

| 항목              | 값                                      |
| --------------- | -------------------------------------- |
| Allowed Origins | `http://localhost:5173`                |
| Allowed Methods | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| Allowed Headers | Authorization, Content-Type, Accept    |
| Exposed Headers | Authorization                          |

> 운영 환경에서는 실제 도메인으로 변경 필요

---

## 9. 전체 흐름

```
# 인증 흐름
클라이언트 → POST /api/members/login → JWT 토큰 발급
클라이언트 → 이후 요청 시 Authorization: Bearer {token} 헤더 포함

# 초대 코드 흐름
MANAGER → POST /api/members/invite-code → 코드 발급 (5분 만료, 일회성)
EMPLOYEE → POST /api/members/join-team  → 코드 입력 → 팀 매핑
서버 → WebSocket(/topic/members/{employeeId}) → TEAM_LINKED 이벤트 전송

# 팀 조회 흐름
EMPLOYEE → GET /api/teams/my-team → 소속 팀(관리자 정보) 조회
MANAGER  → GET /api/teams/{managerId}/members → 팀 소속 직원 목록 조회

# 모니터링 흐름
AI → POST /api/monitoring/event → 서버 저장 → WebSocket(/topic/alerts) → 관리자
```
