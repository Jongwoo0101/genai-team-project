// Features data

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: '실시간 AI 모니터링',
    desc: '딥러닝 기반 영상 분석으로 근무자의 상태를 실시간으로 파악합니다. 졸음, 자리이탈, 휴대폰 사용 등을 즉시 감지합니다.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    title: '즉시 알림 시스템',
    desc: '이상 상태 감지 시 관리자에게 WebSocket 기반 실시간 알림을 전송합니다. 즉각적인 대응이 가능합니다.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    title: '관리자 대시보드',
    desc: '직관적인 대시보드에서 전체 직원의 근무 상태, 이벤트 로그, 통계를 한눈에 확인할 수 있습니다.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: '보안 및 프라이버시',
    desc: '영상 데이터는 분석 후 즉시 폐기되며, 상태 판별 결과만 안전하게 기록됩니다. Spring Security 기반 인증을 제공합니다.',
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-6">
      <div className="max-w-screen-xl mx-auto animate-fade-in-up">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">핵심 솔루션</h1>
          <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full" />
          <p className="text-slate-500 mt-6 text-base sm:text-lg font-medium max-w-2xl mx-auto">
            WorkSight는 최신 AI 기술을 활용하여 단순한 감시가 아닌, 팀의 몰입도를 높이고 건강한 디지털 근무 환경을 만드는 데 집중합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-3xl bg-slate-900/50 border border-white/5 p-8 flex flex-col items-start transition-all duration-300 hover:bg-slate-900/80 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 hover:border-white/10 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-hover:bg-cyan-500/10 transition-all duration-500">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
