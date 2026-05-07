export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-6">
      <div className="max-w-screen-xl mx-auto animate-fade-in-up">
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">작동 원리</h1>
          <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full" />
          <p className="text-slate-500 mt-6 text-lg font-medium">복잡한 설치 없이 브라우저에서 바로 시작하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: '01', title: '간편한 계정 생성', desc: '직원 또는 관리자로 가입하세요. 가입 즉시 10,000 포인트가 지급됩니다.' },
            { step: '02', title: 'AI 분석 활성화', desc: '웹캠을 통해 실시간으로 상태를 분석합니다. 딥러닝 모델이 졸음과 이탈을 감지합니다.' },
            { step: '03', title: '실시간 리포트', desc: '감지된 모든 이벤트는 즉시 관리 대시보드에 기록되어 팀 생산성을 관리합니다.' },
          ].map((item, i) => (
            <div key={i} className="relative group text-center md:text-left bg-slate-900/30 p-8 rounded-3xl border border-white/5 hover:bg-slate-900/60 transition-colors">
              <div className="text-7xl font-black text-white absolute -top-6 -left-2 pointer-events-none transition-colors opacity-20">
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
    </div>
  );
}
