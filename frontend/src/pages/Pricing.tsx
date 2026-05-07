import { Link } from 'react-router-dom';

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

export default function Pricing() {
  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-6">
      <div className="max-w-screen-xl mx-auto animate-fade-in-up">
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">요금제</h1>
          <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full" />
          <p className="text-slate-500 mt-6 text-lg font-medium">합리적인 비용으로 생산성을 극대화하세요</p>
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
              <Link
                to={`/checkout?plan=${plan.name}&price=${plan.price}`}
                className={`block text-center py-4 rounded-2xl font-bold text-sm transition-all duration-300 no-underline cursor-pointer ${
                  plan.accent
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40'
                    : 'border border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                플랜 선택하기
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
