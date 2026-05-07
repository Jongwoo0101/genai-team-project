export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-20 px-6">
      <div className="max-w-screen-md mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">개인정보처리방침</h1>
        <div className="glass-card p-8 text-slate-300 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. 수집하는 개인정보 항목</h2>
            <p>WorkSight는 회원가입 및 서비스 제공을 위해 다음의 개인정보를 수집합니다:<br/>- 필수 항목: 아이디, 비밀번호, 이름 등</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. 개인정보의 수집 및 이용 목적</h2>
            <p>수집된 개인정보는 회원 관리, 서비스 제공, 고객 문의 응대 등의 목적으로만 사용됩니다.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. 개인정보의 보유 및 이용 기간</h2>
            <p>원칙적으로, 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
