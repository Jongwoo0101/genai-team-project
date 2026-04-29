import { Link } from 'react-router-dom';

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

const pricingPlans = [
  {
    name: 'Starter',
    price: '무료',
    period: '',
    desc: '소규모 팀을 위한 기본 플랜',
    features: ['직원 5명까지', '기본 모니터링', '일간 리포트', '이메일 알림'],
    accent: false,
  },
  {
    name: 'Business',
    price: '₩49,000',
    period: '/월',
    desc: '성장하는 기업을 위한 플랜',
    features: ['직원 50명까지', 'AI 고급 분석', '실시간 알림', '주간/월간 리포트', 'WebSocket 알림', '우선 지원'],
    accent: true,
  },
  {
    name: 'Enterprise',
    price: '문의',
    period: '',
    desc: '대기업 맞춤형 솔루션',
    features: ['직원 무제한', '맞춤형 AI 모델', 'API 연동 지원', '전담 매니저', '온프레미스 설치', 'SLA 보장'],
    accent: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ====== Hero Section ====== */}
      <section className="relative overflow-hidden pt-32 pb-24 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-cyan-500/8 via-blue-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-cyan-400/40 animate-pulse-dot" />
          <div className="absolute top-40 right-20 w-1.5 h-1.5 rounded-full bg-blue-400/30 animate-pulse-dot" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/4 w-1 h-1 rounded-full bg-purple-400/30 animate-pulse-dot" style={{ animationDelay: '0.5s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-dot" />
            <span className="text-cyan-400 text-sm font-medium">AI 기반 스마트 모니터링</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            근무 환경을
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              더 스마트하게
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            WorkSight는 AI 영상 분석 기술로 직원의 근무 상태를 실시간 모니터링하여,
            <br className="hidden sm:block" />
            안전하고 효율적인 작업 환경을 만들어갑니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/login"
              className="px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 no-underline shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
            >
              무료로 시작하기
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl text-base font-medium text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all duration-300 no-underline hover:-translate-y-0.5"
            >
              자세히 알아보기
            </a>
          </div>
        </div>
      </section>

      {/* ====== Features Section ====== */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">핵심 기능</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              WorkSight가 제공하는 강력한 근무 환경 모니터링 기능들
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass-card p-8 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== How It Works ====== */}
      <section className="py-24 px-6 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">어떻게 작동하나요?</h2>
            <p className="text-slate-400 text-lg">단 3단계로 시작하는 스마트 모니터링</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '카메라 연결', desc: '직원 PC의 웹캠을 WorkSight에 연결합니다. 별도의 장비가 필요 없습니다.' },
              { step: '02', title: 'AI 분석 시작', desc: 'AI가 실시간으로 영상을 분석하여 졸음, 자리이탈 등의 상태를 판별합니다.' },
              { step: '03', title: '알림 & 관리', desc: '이상 상태 감지 시 관리자에게 즉시 알림이 전송되고, 대시보드에서 관리합니다.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block mt-6 text-slate-700 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Pricing Section ====== */}
      <section className="py-24 px-6 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">요금제</h2>
            <p className="text-slate-400 text-lg">팀 규모에 맞는 플랜을 선택하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`glass-card p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  plan.accent
                    ? 'border-cyan-500/40 glow-cyan relative'
                    : 'hover:border-slate-600'
                }`}
              >
                {plan.accent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-bold text-white">
                    인기
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-slate-500 text-sm mb-5">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-slate-500 text-sm">{plan.period}</span>}
                </div>
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 no-underline ${
                    plan.accent
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20'
                      : 'border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  시작하기
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="border-t border-slate-800/60 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-400">
              Work<span className="text-cyan-400">Sight</span>
            </span>
          </div>
          <p className="text-sm text-slate-600">© 2026 WorkSight. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
