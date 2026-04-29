# Frontend Pipeline & Directory Structure

현재 `frontend` 폴더 내에 React + Vite를 기반으로 초기 뼈대가 구축되어 있습니다. 코드는 아직 작성하지 않은 상태이며, 앞으로 프론트엔드 개발이 진행될 구조와 파이프라인은 다음과 같습니다.

## 📁 디렉토리 구조 (Directory Structure)

```text
frontend/
├── src/
│   ├── components/            # 공통 UI 컴포넌트 (버튼, 카드, 모달 등)
│   ├── lib/                   # 외부 API 통신 (fetch 등) 및 유틸리티 함수
│   ├── pages/                 # 각 화면의 최상위 컴포넌트
│   │   ├── Home.tsx           # 메인 홈 화면 (서비스 소개 및 가격 안내)
│   │   ├── Login.tsx          # 로그인 / 회원가입 (직원/관리자 선택)
│   │   ├── EmployeeView.tsx   # 직원용 실행 화면 (웹캠 미리보기 및 상태 확인)
│   │   └── ManagerDashboard.tsx # 관리자용 대시보드 (로그 확인 및 실시간 알림)
│   ├── store/                 # 전역 상태 관리 (Zustand)
│   ├── AppRoutes.tsx          # 페이지 이동을 담당하는 라우터 설정 파일
│   ├── App.tsx                # 최상위 컴포넌트
│   └── main.tsx               # 리액트 진입점
└── package.json               # TailwindCSS, Zustand, React-Router-Dom 등 설치 완료
```

## 🚀 개발 파이프라인 (Development Pipeline)

백엔드 명세가 나오기 전까지 프론트엔드는 다음 순서로 개발 파이프라인을 가져갑니다.

1. **라우팅 및 레이아웃 구성**:
   - `AppRoutes.tsx`에 `pages/` 폴더 내의 각 화면들을 연결합니다.
   - 네비게이션 바와 기본 레이아웃을 작성합니다.

2. **UI 퍼블리싱 및 Mock Data 적용**:
   - 각 페이지(`Home`, `Login`, `EmployeeView`, `ManagerDashboard`)의 화면 UI를 TailwindCSS를 사용하여 퍼블리싱합니다.
   - 백엔드 API가 없으므로, **Mock Data(가짜 데이터)** 를 생성하여 화면에 띄웁니다.

3. **상태 변화 관리 로직 구현 (가장 중요)**:
   - `EmployeeView.tsx`에 가상의 AI 판별 로직(혹은 랜덤 상태 생성 로직)을 붙입니다.
   - 상태가 변경되었을 때만 (예: 정상 -> 졸음) `lib/`의 통신 함수를 호출하도록 **상태 변화 감지 최적화 로직**을 구현합니다.

4. **웹소켓(알림) 시뮬레이션**:
   - `ManagerDashboard.tsx`에서 모의 웹소켓 이벤트를 수신받아, 직원들의 이상 상태 발생 시 화면에 즉각적으로 알림과 로그가 뜨도록 구현합니다.

5. **백엔드 연동 (추후)**:
   - 백엔드(`worksight-api`) 설계가 끝나고 실제 API가 완성되면, `lib/`에 구현해 둔 Mock API 호출 부분을 실제 `fetch` 요청으로 교체합니다.
