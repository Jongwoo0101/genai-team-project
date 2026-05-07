import { useState } from 'react';
import { Link } from 'react-router-dom';
import AgreementModal from '../components/AgreementModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const TERMS_CONTENT = `제 1 장 총칙

제 1 조 (목적)
본 약관은 WorkSight(이하 "회사")가 제공하는 AI 기반 근무 모니터링 서비스(이하 "서비스")의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.

제 2 조 (수집하는 개인정보의 항목)
서비스는 화상 데이터(얼굴 형태 등)를 실시간으로 분석하며, 해당 데이터는 분석 직후 즉시 폐기됩니다. 분석된 결과(졸음, 자리 이탈 등 상태 로그)만 저장되어 관리자에게 제공됩니다.

제 3 조 (데이터 보호 및 프라이버시)
회사는 이용자의 프라이버시를 최우선으로 보호하며, 수집된 근무 상태 데이터는 서비스 제공 목적(근태 및 몰입도 관리) 이외의 용도로 절대 사용되지 않습니다.

제 4 조 (이용자의 동의)
서비스를 이용함은 본인의 근무 상태가 카메라를 통해 AI 모듈에 의해 실시간 분석되고 기록되는 것에 명시적으로 동의함을 의미합니다.`;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ====== Hero Section ====== */}
      <section className="relative overflow-hidden pt-40 pb-32 px-8">
        {/* Advanced Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative max-w-screen-xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/5 bg-white/[0.03] backdrop-blur-md mb-10 animate-fade-in-up shadow-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-dot" />
            <span className="text-cyan-400 text-xs font-bold tracking-widest uppercase">Next-Gen AI Monitoring</span>
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-tight tracking-tighter mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            WorkSight로
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
              스마트하게 근무하세요
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-14 leading-relaxed font-medium animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            AI 실시간 영상 분석 기술로 팀의 몰입도를 높이고 
            <br className="hidden sm:block" />
            건강한 디지털 근무 문화를 선도합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary px-10 py-4 text-lg no-underline cursor-pointer">
              지금 무료로 시작하기
            </button>
            <a href="#features" className="px-10 py-4 rounded-2xl text-lg font-bold text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all duration-300 no-underline backdrop-blur-sm">
              기능 둘러보기
            </a>
          </div>
        </div>
      </section>

      {/* ====== Features Section ====== */}
      <section id="features" className="py-24 px-6 relative scroll-mt-24">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">핵심 솔루션</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full" />
            <p className="text-slate-500 mt-6 text-sm sm:text-base font-medium max-w-2xl mx-auto">
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
      </section>

      {/* ====== How It Works ====== */}
      <section className="py-32 px-8 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">작동 원리</h2>
            <p className="text-slate-500 text-lg font-medium">복잡한 설치 없이 브라우저에서 바로 시작하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '01', title: '간편한 계정 생성', desc: '직원 또는 관리자로 가입하세요. 가입 즉시 10,000 포인트가 지급됩니다.' },
              { step: '02', title: 'AI 분석 활성화', desc: '웹캠을 통해 실시간으로 상태를 분석합니다. 딥러닝 모델이 졸음과 이탈을 감지합니다.' },
              { step: '03', title: '실시간 리포트', desc: '감지된 모든 이벤트는 즉시 관리 대시보드에 기록되어 팀 생산성을 관리합니다.' },
            ].map((item, i) => (
              <div key={i} className="relative group text-center md:text-left">
                <div className="text-7xl font-black text-white/[0.03] absolute -top-10 -left-4 pointer-events-none group-hover:text-cyan-500/10 transition-colors">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-4">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Pricing Section ====== */}
      <section className="py-32 px-8 border-t border-white/5">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">요금제</h2>
            <p className="text-slate-500 text-lg font-medium">합리적인 비용으로 생산성을 극대화하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`glass-card p-10 flex flex-col transition-all duration-500 hover:-translate-y-2 ${
                  plan.accent
                    ? 'border-cyan-500/30 glow-cyan relative bg-slate-900/60'
                    : 'bg-slate-900/30'
                }`}
              >
                {plan.accent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black text-white uppercase tracking-widest shadow-xl">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
                <p className="text-slate-500 text-sm mb-8 font-medium">{plan.desc}</p>
                <div className="mb-10">
                  <span className="text-5xl font-black text-white tracking-tighter">{plan.price}</span>
                  {plan.period && <span className="text-slate-500 text-lg ml-1">{plan.period}</span>}
                </div>
                <ul className="flex-1 space-y-4 mb-10">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full block text-center py-4 rounded-2xl font-bold text-sm transition-all duration-300 no-underline cursor-pointer ${
                    plan.accent
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40'
                      : 'border border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  플랜 선택하기
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="border-t border-white/5 py-20 px-8 bg-slate-950">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">
                Work<span className="text-cyan-400">Sight</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">AI 기반 스마트 근무 모니터링 플랫폼</p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex gap-8 text-sm font-bold text-slate-500 mb-4">
              <Link to="/terms" className="hover:text-cyan-400 transition-colors no-underline">이용약관</Link>
              <Link to="/privacy" className="hover:text-cyan-400 transition-colors no-underline">개인정보처리방침</Link>
              <Link to="/support" className="hover:text-cyan-400 transition-colors no-underline">고객지원</Link>
            </div>
            <p className="text-slate-600 text-xs">© 2026 WorkSight Team. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AgreementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="WorkSight 시작하기"
        description="서비스를 이용하기 위해 아래 안내사항과 이용약관에 동의해 주세요."
        terms={TERMS_CONTENT}
        targetPath="/login"
      />
    </div>
  );
}
