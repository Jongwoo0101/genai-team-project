# Frontend Pipeline & Directory Structure

현재 `frontend` 폴더 내에 React + Vite + TailwindCSS를 기반으로 한 핵심 UI 및 라우팅 시스템이 구축 완료되었습니다. 초기 뼈대를 넘어 현재는 **백엔드(Spring Boot)와의 API 연동 및 실시간 모니터링 기능 구현** 단계에 있습니다.

## 📁 디렉토리 구조 (Directory Structure)

```text
frontend/
├── src/
│   ├── components/            # 공통 UI 컴포넌트
│   │   ├── Navbar.tsx         # 전역 네비게이션 바 (로그아웃 및 사용자 정보)
│   │   └── Layout.tsx         # 기본 페이지 레이아웃
│   ├── lib/                   # 외부 통신 및 유틸리티
│   │   ├── api.ts             # Spring Boot API 호출 함수 정의 (Fetch API)
│   │   ├── mockData.ts        # 백엔드 미연동 시 사용되는 테스트 데이터
│   │   └── types.ts           # TypeScript 인터페이스/타입 정의
│   ├── pages/                 # 주요 서비스 화면
│   │   ├── Home.tsx           # 메인 홈 (서비스 소개)
│   │   ├── Login.tsx          # 통합 로그인 (직원/관리자 공용)
│   │   ├── EmployeeView.tsx   # 직원용: 웹캠 실시간 상태 감지 및 리포팅
│   │   └── ManagerDashboard.tsx # 관리자용: 실시간 모니터링 및 통계 대시보드
│   ├── store/                 # 전역 상태 관리
│   │   └── authStore.ts       # Zustand 기반 인증/사용자 상태 관리
│   ├── AppRoutes.tsx          # React Router 라우팅 설정 (보호된 라우트 포함)
│   ├── App.tsx                # 최상위 컴포넌트
│   ├── main.tsx               # 진입점
│   └── index.css              # 글로벌 스타일 및 TailwindCSS 설정
└── vite.config.ts             # 백엔드 프록시(/api, /ws) 설정 포함
```

## 🚀 개발 파이프라인 (Development Pipeline)

### ✅ Phase 1: 기반 구축 (Completed)
- [x] Vite + React + TypeScript 환경 설정
- [x] TailwindCSS 디자인 시스템 적용
- [x] React Router를 이용한 페이지 전환 및 기본 레이아웃 구성

### ✅ Phase 2: UI 퍼블리싱 & Mock Data (Completed)
- [x] 핵심 4개 페이지(`Home`, `Login`, `EmployeeView`, `ManagerDashboard`) UI 구현
- [x] 반응형 레이아웃 대응 (Mobile/Desktop)
- [x] 가짜 데이터(Mock Data)를 활용한 대시보드 및 로그 가시화

### 🔄 Phase 3: 전역 상태 관리 & 로직 최적화 (In Progress)
- [x] Zustand(`authStore`)를 통한 사용자 인증 상태 관리
- [x] `EmployeeView`의 AI 판별 시뮬레이션 로직 구현
- [ ] 상태 변화 감지 최적화 (불필요한 API 호출 방지 로직 고도화)

### 🔄 Phase 4: 백엔드 API 연동 (Active)
- [x] `vite.config.ts` 프록시 설정 (localhost:8080 연결)
- [x] 회원가입(`signUp`) 및 로그인(`login`) API 연동 완료
- [🔄] 대시보드 통계(`getDashboardStats`) 및 이벤트 로그(`getWorkEvents`) 연동 중
- [🔄] 실시간 이벤트 리포트(`reportEvent`) 연동 중

### 📅 Phase 5: 실시간 기능 & 고도화 (Upcoming)
- [ ] WebSocket(`STOMP/SockJS`)을 이용한 실시간 관리자 알림
- [ ] 카메라 권한 관리 및 예외 처리 강화
- [ ] 실제 AI 모델(TensorFlow.js 등) 클라이언트 측 통합 검토

