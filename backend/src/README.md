# WorkSight API 명세서

## 1. 기본 정보

* Base URL: `/api`
* Content-Type: `application/json`
* 인증: JWT Bearer 토큰 (로그인·회원가입 제외 모든 API에 필요)

### 인증 헤더

```
Authorization: Bearer {token}
```

---

## 2. 회원 API

### 2.1 회원가입

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

| 필드       | 타입     | 설명                        |
| -------- | ------ | ------------------------- |
| username | String | 사용자 아이디 (중복 불가)           |
| password | String | 비밀번호 (서버에서 BCrypt 암호화됨)   |
| role     | Enum   | 사용자 권한 (`MANAGER` / `EMPLOYEE`) |

#### Response `200 OK`

```json
{
  "id": 1,
  "username": "test",
  "role": "EMPLOYEE",
  "virtualBalance": 10000
}
```

#### 예외 상황

| 상황         | HTTP  | 메시지                          |
| ---------- | ----- | ------------------------------ |
| 아이디 중복     | `409` | "이미 사용 중인 아이디입니다."          |

#### 설명

* 회원 생성 후 DB 저장
* 가입 시 `virtualBalance` 기본값 10,000 지급

---

### 2.2 로그인

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
  "id": 1,
  "username": "test",
  "role": "EMPLOYEE",
  "virtualBalance": 10000
}
```

#### 필드 설명

| 필드             | 타입     | 설명                  |
| -------------- | ------ |---------------------|
| token          | String | JWT 액세스 토큰 (30분 유효) |
| id             | Long   | 회원 고유 ID            |
| username       | String | 사용자 아이디             |
| role           | Enum   | 사용자 권한              |
| virtualBalance | Long   | 가상 머니 잔액            |

#### 예외 상황

| 상황        | HTTP  | 메시지                                        |
| --------- | ----- | -------------------------------------------- |
| 사용자 없음   | `400` | "존재하지 않는 아이디입니다. 아이디를 다시 확인해주세요." |
| 비밀번호 틀림  | `400` | "비밀번호가 올바르지 않습니다. 다시 확인해주세요."      |

#### 설명

* 로그인 성공 시 JWT 토큰과 유저 정보를 함께 반환
* 이후 모든 요청에 `Authorization: Bearer {token}` 헤더 포함 필요

---

## 3. 모니터링 API

> 모든 모니터링 API는 JWT 인증 필요

### 3.1 이벤트 전송

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

#### 설명

1. 직원 조회
2. 비정상 상태일 경우 이벤트 저장
3. 웹소켓으로 관리자에게 실시간 알림 전송

---

## 4. 웹소켓 API

### 4.1 연결 엔드포인트

```
/ws-monitoring
```

### 4.2 구독 경로

```
/topic/alerts
```

### 4.3 수신 데이터

```json
{
  "eventId": 10,
  "employeeId": 1,
  "employeeName": "test",
  "eventType": "SLEEP",
  "eventTime": "2026-04-29T21:00:00"
}
```

#### 설명

* AI 모듈이 이벤트를 전송하면
* 서버가 관리자에게 실시간으로 알림을 전달

---

## 5. Enum 정의

### 5.1 Role

| 값          | 설명  |
| ---------- | --- |
| `MANAGER`  | 관리자 |
| `EMPLOYEE` | 직원  |

### 5.2 EventType

| 값        | 설명   |
| -------- | ---- |
| `NORMAL` | 정상   |
| `SLEEP`  | 졸음   |
| `AWAY`   | 자리비움 |

---

## 6. 보안 및 설정

### 6.1 Security

* CSRF 비활성화
* JWT Stateless 인증 적용
* 인증 불필요 경로: `POST /api/members/signup`, `POST /api/members/login`, `/h2-console/**`
* 그 외 모든 요청은 유효한 JWT 토큰 필요

### 6.2 CORS

| 항목              | 값                          |
| --------------- | -------------------------- |
| Allowed Origins | `http://localhost:5173`    |
| Allowed Methods | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| Allowed Headers | Authorization, Content-Type, Accept |
| Exposed Headers | Authorization               |

> 운영 환경에서는 실제 도메인으로 변경 필요

---

## 7. 전체 흐름

```
# 인증 흐름
클라이언트 → POST /api/members/login → JWT 토큰 발급
클라이언트 → 이후 요청 시 Authorization: Bearer {token} 헤더 포함

# 모니터링 흐름
AI → POST /api/monitoring/event → 서버 저장 → WebSocket(/topic/alerts) → 관리자
```
