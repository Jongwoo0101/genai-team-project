# WorkSight API 명세서

## 1. 기본 정보

* Base URL: `/api`
* Content-Type: `application/json`
* 인증: 없음 (현재 모든 API permitAll)

---

## 2. 회원 API

### 2.1 회원가입

```
POST /api/members/signup
```

#### Request

```json
{
  "username": "string",
  "password": "string",
  "role": "ADMIN | USER"
}
```

#### 필드 설명

| 필드       | 타입     | 설명               |
| -------- | ------ | ---------------- |
| username | String | 사용자 아이디          |
| password | String | 비밀번호 (서버에서 암호화됨) |
| role     | Enum   | 사용자 권한           |

#### Response

```json
{
  "id": 1,
  "username": "test",
  "role": "USER",
  "balance": 0
}
```

#### 설명

* 회원을 생성하고 DB에 저장
* 비밀번호는 BCrypt로 암호화됨

---

### 2.2 로그인

```
POST /api/members/login
```

#### Request

```json
{
  "username": "string",
  "password": "string"
}
```

#### Response

```json
{
  "id": 1,
  "username": "test",
  "role": "USER",
  "balance": 0
}
```

#### 예외 상황

| 상황      | 메시지                |
| ------- | ------------------ |
| 사용자 없음  | "User not found"   |
| 비밀번호 틀림 | "Invalid password" |

#### 설명

* 현재는 JWT 없음 (추후 확장 예정)
* 단순 인증 후 사용자 정보 반환

---

## 3. 모니터링 API

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

* NORMAL → 무시 (DB 저장 X)
* 그 외 → DB 저장 및 알림 전송

#### Response

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

```
ADMIN
USER
```

### 5.2 EventType

```
NORMAL
SLEEP
AWAY
```

---

## 6. 보안 및 설정

### 6.1 Security

* CSRF 비활성화
* 모든 API 공개 (permitAll)
* JWT 미적용

### 6.2 CORS

* 모든 origin 허용 (`*`)
* 운영 환경에서는 제한 필요

---

## 7. 전체 흐름

```
AI → /api/monitoring/event → 서버 저장 → WebSocket → 관리자
```
