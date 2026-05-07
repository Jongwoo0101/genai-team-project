export default function Support() {
  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-20 px-6">
      <div className="max-w-screen-md mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">고객지원</h1>
        <div className="glass-card p-8 text-slate-300 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">무엇을 도와드릴까요?</h2>
            <p>WorkSight 서비스 이용 중 불편한 점이나 궁금한 사항이 있으신가요?</p>
          </section>
          <section className="bg-slate-800/30 p-6 rounded-2xl border border-white/5">
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">이메일 문의</h2>
            <p>test1234@tukorea.ac.kr</p>
            <p className="text-xs text-slate-500 mt-2">운영시간: 평일 10:00 ~ 17:00 (주말 및 공휴일 휴무)</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">자주 묻는 질문 (FAQ)</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>웹캠이 인식되지 않습니다.</li>
              <li>AI 모니터링 알림은 어떻게 받나요?</li>
              <li>가상 포인트는 어떻게 환전할 수 있나요?</li>
            </ul>
            <p className="mt-4 text-slate-500 italic">FAQ 상세 페이지는 준비 중입니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
