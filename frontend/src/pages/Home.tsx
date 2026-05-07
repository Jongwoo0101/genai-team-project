import { useState } from 'react';
import { Link } from 'react-router-dom';
import AgreementModal from '../components/AgreementModal';

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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ====== Hero Section ====== */}
      <section className="relative overflow-hidden pt-40 pb-32 px-8 flex-1 flex flex-col justify-center">
        {/* Advanced Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative max-w-screen-xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/5 bg-white/[0.03] backdrop-blur-md mb-10 animate-fade-in-up shadow-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-dot" />
            <span className="text-cyan-400 text-xs font-bold tracking-widest uppercase">Next-Gen AI Monitoring</span>
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-tight tracking-tighter mb-8 animate-fade-in-up delay-100">
            WorkSight로
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
              스마트하게 근무하세요
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-14 leading-relaxed font-medium animate-fade-in-up delay-200">
            AI 실시간 영상 분석 기술로 팀의 몰입도를 높이고 
            <br className="hidden sm:block" />
            건강한 디지털 근무 문화를 선도합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up delay-300">
            <button onClick={() => setIsModalOpen(true)} className="btn-primary px-10 py-4 text-lg no-underline cursor-pointer">
              지금 무료로 시작하기
            </button>
            <Link to="/features" className="px-10 py-4 rounded-2xl text-lg font-bold text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all duration-300 no-underline backdrop-blur-sm">
              기능 둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="border-t border-white/5 py-20 px-8 bg-slate-950 mt-auto">
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
