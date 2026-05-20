# 프로젝트 작업 진척도 (TODO.md)

## 완료
- [x] `plan.txt` 요구사항 분석 및 `PLAN.md` 수립 (@prompt-planner, 2026-05-20)
- [x] 구현 계획서(`implementation_plan.md`) 작성 및 피드백 대기 (@prompt-planner, 2026-05-20)
- [x] 구현 계획서 사용자 승인 완료 (@ux-designer, @fe-dev, 2026-05-20)
- [x] `recharts` 시각화 라이브러리 추가 (@fe-dev, 2026-05-20)
- [x] Zustand 스토어 개편 및 신설 (출퇴근/상태 스토어 수정, 스탠드업 및 영상통화 스토어 신규 추가) (@fe-dev, 2026-05-20)
- [x] 가상 영상통화 컴포넌트 (`VideoCallModal.tsx`) 신규 개발 (@fe-dev, 2026-05-20)
- [x] 직원 화면 (`EmployeeView.tsx`) 피벗 및 확장 (수동 상태 선택, 데일리 스탠드업 작성, 영상통화 개설) (@fe-dev, 2026-05-20)
- [x] 관리자/팀 대시보드 (`ManagerDashboard.tsx`) 피벗 및 확장 (실시간 협업 보드, 시간별 순 인원 차트, 데일리 스탠드업 모아보기) (@fe-dev, 2026-05-20)
- [x] 직원 화면 (`EmployeeView.tsx`) 내 실시간 AI 카메라 모니터링 연동 및 상태 자동 토글 구현 (@fe-dev, 2026-05-20)
- [x] 관리자 대시보드 (`ManagerDashboard.tsx`) 내 실시간 이상 행동 웹소켓 알림 패널 구현 (@fe-dev, 2026-05-20)
- [x] 상사 디렉토링 긴급 알림(DirectPing) 작성 및 오버레이 알람(경보음 포함) 구현 (@fe-dev, 2026-05-20)
- [x] 회의실 참가 승인(JoinRequest) 및 초대(Invitation) 실시간 연동 구현 (@fe-dev, 2026-05-20)
- [x] 프론트엔드 빌드 및 컴파일 성공 검증 완료 (@qa-tester, 2026-05-20)
- [x] 코드 리뷰 및 시스템 안정성 보완 (Zustand 직렬화 예외 처리, 회의실 퇴장 트랩 루프 방지, 사운드 루프 제거, 웹소켓 커넥션 누수 해결) (@fe-dev, @qa-tester, 2026-05-20)
- [x] WorkSight API v2.0 통합 연동 (출퇴근, AI 상태 변경, 수동 상태 변경, 팀 상태 목록 조회 API) (@fe-dev, 2026-05-20)
- [x] 백엔드 status 컨트롤러 누락(404) 대응을 위한 Option B Fallback (localStorage Mock 브로드캐스트) 및 다중 탭 동기화 기능 탑재 (@fe-dev, 2026-05-20)
- [x] 매니저 대시보드 내 실시간 상태 변경 로그 수신 및 `/topic/team/{managerId}` 웹소켓 구독 개편 (@fe-dev, 2026-05-20)

## 진행 중

## 대기
- [ ] Vercel 최종 배포 및 릴리즈 리포트 작성 (@ops-manager)
