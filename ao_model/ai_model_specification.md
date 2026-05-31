# 🤖 WorkSight AI Model API 명세서

## API 개요
본 API는 사용자의 로컬 웹캠 비디오 프레임을 실시간으로 전달받아 얼굴, 포즈, 특정 객체(휴대폰 등)를 감지하고 직원의 근무 상태를 판별하는 로컬 AI 에이전트 서비스입니다. 
React 프론트엔드 대시보드와는 **로컬 WebSocket(ws)** 프로토콜을 통해 양방향 실시간 통신을 수행하며, 판별된 근무 상태에 변경이 생길 경우 **백엔드 REST API(HTTP PUT)**를 호출하여 서버의 DB에 상태를 갱신합니다.

---

## 인증(Authentication)과 권한 부여(Authorization)
* **로컬 웹소켓**: 
  * 외부 접근을 차단하기 위해 기본적으로 `localhost` 루프백 인터페이스로 바인딩됩니다.
  * 프론트엔드가 최초 연결 시 전송하는 `init` 타입의 메시지 본문에 Spring Boot 백엔드에서 발급받은 **JWT Access Token**을 포함하여 전송해야 합니다.
* **백엔드 API 호출**:
  * AI 에이전트가 백엔드로 상태 변경을 보고할 때, 초기화 시 저장한 JWT Access Token을 HTTP 헤더의 `Authorization: Bearer {token}` 형식으로 제공하여 인증 및 권한을 획득합니다.

---

## 에러(Error) 처리 설명
* **이미지 디코딩 실패**: 
  * 프론트엔드로부터 비정상적인 Base64 데이터나 깨진 프레임 이미지가 수신되는 경우, 에러 로그를 남기고 해당 프레임은 분석을 즉시 스킵(Skip)하여 메모리 누수 및 서버 중단을 방지합니다.
* **백엔드 API 호출 예외**:
  * 네트워크 장애 또는 토큰 만료 등의 이유로 백엔드 서버(`PUT /api/status/ai`) 통신이 실패할 경우, 예외 처리를 수행하고 로깅 시스템에 기록을 남긴 뒤 분석 스트림은 정상 유지합니다.
* **웹소켓 연결 유실**:
  * 클라이언트(프론트엔드) 창 닫기 또는 브라우저 이탈 등으로 인해 연결이 갑작스럽게 종료되면, `websockets.exceptions.ConnectionClosed` 예외를 안전하게 포착하고 할당된 자원을 반환하며 연결 리스너를 정리합니다.

---

## 자원(Resource) 모델 설명
* **자원(Resource)**: `EmployeeStatus` (직원 근무 상태 정보)
* **식별자**: `employeeId` (직원 고유 번호)
* **상태와 상태 전이**:
  * 직원의 상태는 **`WORKING` (근무 중)**과 **`AWAY` (자리 비움)**의 두 가지 주 상태로 표현됩니다.
  * **상태 전이 조건**:
    * 1차 판정(Raw Status)이 변경된 후, 노이즈 필터링을 위해 지정된 임계시간(Threshold) 동안 해당 상태가 안정적으로 유지되어야만 최종 확정 상태(`confirmed_status`)가 전이됩니다.
    * `AWAY` 전이 임계치: 10초 지속 시 전이
    * `WORKING` 전이 임계치: 2초 지속 시 전이
  * **상태 보고 규칙 (Cooldown)**:
    * 상태가 전이되었을 때, 동일 상태에 대해 30초의 보고 쿨다운 제한이 적용되며 쿨다운이 지난 경우에만 서버에 업데이트를 보냅니다.

---

## API 목록

구분 | API 명 | 설명
:--- | :--- | :---
실시간 연결 | 세션 초기화 및 인증 (`init`) | 로컬 AI 서버에 웹소켓 연결 후 토큰과 사원 정보를 제공하여 세션을 초기화합니다.
실시간 분석 | 이미지 프레임 분석 (`frame`) | 실시간 비디오 프레임(Base64)을 분석하고 확정 상태 판별 결과를 반환합니다.
실시간 해제 | 세션 모니터링 종료 (`stop`) | 모니터링 세션을 종료하고 분석 파이프라인을 정지합니다.
정보 업데이트 | AI 판별 상태 서버 보고 | AI가 확정한 근무 상태를 백엔드 웹 서버로 즉시 전송하여 저장합니다.

---

## 세션 초기화 및 인증 (`init`)

로컬 AI 서버에 연결을 완료한 후, 사원 식별자와 백엔드 연동을 위한 JWT 토큰을 제공하여 세션을 준비시킵니다.

### Request

#### Request Syntax
```json
{
  "type": "init",
  "employeeId": 12,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

메서드 | 요청 URL
:--- | :---
WEBSOCKET | `ws://localhost:8765/ws/monitor`

#### Request Header
> **참고**: 웹소켓 프로토콜 통신으로, HTTP의 일반적인 Request Header 대신 JSON Payload 내부에 인증 정보를 명시합니다.

파라미터 | 타입 | 필수여부 | 설명
:--- | :--- | :--- | :---
type | String | 필수 | 메시지 타입 (값: `"init"`)
employeeId | Integer | 필수 | 직원의 고유 번호
token | String | 필수 | 백엔드 API 호출을 위한 JWT Access Token

---

### Response

#### Response Syntax
```json
{
  "type": "ready"
}
```

#### Response Elements

필드 | 타입 | 필수여부 | 설명
:--- | :--- | :--- | :---
type | String | 필수 | 세션 준비 완료를 알리는 타입 (값: `"ready"`)

---

## 이미지 프레임 분석 (`frame`)

웹캠 비디오의 캡처된 개별 프레임 이미지를 전송하여 눈 감김, 고개 돌림, 휴대폰 및 포즈 분석을 요청합니다.

### Request

#### Request Syntax
```json
{
  "type": "frame",
  "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQ..."
}
```

메서드 | 요청 URL
:--- | :---
WEBSOCKET | `ws://localhost:8765/ws/monitor`

#### Request Elements

파라미터 | 타입 | 필수여부 | 설명
:--- | :--- | :--- | :---
type | String | 필수 | 메시지 타입 (값: `"frame"`)
data | String | 필수 | JPEG 비디오 프레임 이미지의 Base64 인코딩 데이터

---

### Response

#### Response Syntax
```json
{
  "type": "result",
  "state": "WORKING",
  "confidence": 0.85,
  "fps": 0
}
```

#### Response Elements

필드 | 타입 | 필수여부 | 설명
:--- | :--- | :--- | :---
type | String | 필수 | 분석 결과 타입 (값: `"result"`)
state | String | 필수 | AI가 판별 및 시계열 필터링을 통해 확정한 상태 (`"WORKING"` 또는 `"AWAY"`)
confidence | Float | 필수 | 확정 상태 판별에 대한 AI 모델 신뢰도 수치 (0.0 ~ 1.0)
fps | Integer | 필수 | 초당 분석 프레임 속도 (현재 미사용으로 0 반환)

---

## 세션 모니터링 종료 (`stop`)

모니터링 세션을 공식적으로 종료하고, 활성화된 모델과 리소스를 정리합니다.

### Request

#### Request Syntax
```json
{
  "type": "stop"
}
```

메서드 | 요청 URL
:--- | :---
WEBSOCKET | `ws://localhost:8765/ws/monitor`

#### Request Elements

파라미터 | 타입 | 필수여부 | 설명
:--- | :--- | :--- | :---
type | String | 필수 | 메시지 타입 (값: `"stop"`)

---

### Response
> **참고**: `stop` 메시지 전송 시 로컬 AI 서버는 세션을 조용히 닫으며, 별도의 웹소켓 응답 본문을 보내지 않고 소켓 연결을 종료합니다.

---

## AI 판별 상태 서버 보고

로컬 AI 모듈이 확정한 상태 변화 이벤트를 Spring Boot 백엔드 웹 서버로 즉시 전송하여 상태를 업데이트합니다.

### Request

#### Request Syntax
```bash
curl -X PUT http://localhost:8080/api/status/ai \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ \
        "statusType": "AWAY" \
      }'
```

메서드 | 요청 URL
:--- | :---
PUT | `http://localhost:8080/api/status/ai`

#### Request Header

파라미터 | 타입 | 필수여부 | 설명
:--- | :--- | :--- | :---
Authorization | String | 필수 | 인증 키 (Bearer {JWT_TOKEN})
Content-Type | String | 필수 | 전송 데이터 타입 (값: `application/json`)

#### Request Elements

파라미터 | 타입 | 필수여부 | 설명
:--- | :--- | :--- | :---
statusType | String | 필수 | 변경할 근무 상태 유형 (`"WORKING"` 또는 `"AWAY"`)

---

### Response
> **참고**: 백엔드 서버의 해당 엔드포인트는 상태 저장을 수행한 뒤, 특별한 반환 본문 없이 성공 응답(200 OK)을 반환합니다.
