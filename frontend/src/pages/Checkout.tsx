import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function Checkout() {
  const [selectedMethod, setSelectedMethod] = useState('신용카드');
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const planName = searchParams.get('plan') || 'Business';
  const planPrice = searchParams.get('price') || '₩49,000';

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="flex items-center gap-4 mb-12">
          <Link to="/pricing" className="p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">결제하기</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Payment Info */}
          <div className="lg:col-span-3 space-y-8">
            <div className="glass-card p-8 bg-slate-900/40 border-white/5">
              <h3 className="text-lg font-bold text-white mb-6">결제 수단 선택</h3>
              <div className="grid grid-cols-3 gap-4">
                {['신용카드', '카카오페이', '계좌이체'].map((method) => (
                  <div 
                    key={method} 
                    onClick={() => setSelectedMethod(method)}
                    className={`p-4 rounded-2xl border text-center cursor-pointer transition-all ${
                      selectedMethod === method 
                        ? 'border-cyan-500/50 bg-cyan-500/5 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]' 
                        : 'border-white/5 bg-slate-800/30 text-slate-500 hover:border-white/10'
                    }`}
                  >
                    <span className="text-sm font-bold">{method}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedMethod === '신용카드' ? (
              <div className="glass-card p-8 bg-slate-900/40 border-white/5 space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold text-white mb-2">카드 정보 입력</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">카드 번호</label>
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-cyan-500/50 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">유효 기간 (MM/YY)</label>
                      <input type="text" placeholder="MM/YY" className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-cyan-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">CVC</label>
                      <input type="text" placeholder="123" className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-cyan-500/50 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 bg-slate-900/20 border-dashed border-white/5 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="opacity-20">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                    <path d="M12 6V12L16 14" />
                  </svg>
                </div>
                <h3 className="text-white font-bold mb-2">{selectedMethod} 결제 준비 중</h3>
                <p className="text-slate-500 text-sm max-w-[240px]">선택하신 결제 수단으로 결제를 진행합니다. 결제하기 버튼을 눌러주세요.</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="glass-card p-8 bg-slate-900/60 border-cyan-500/20 glow-cyan sticky top-32">
              <h3 className="text-xl font-black text-white mb-6 tracking-tight">주문 요약</h3>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-500 font-medium text-sm">선택한 플랜</span>
                <span className="text-white font-bold">{planName}</span>
              </div>
              <div className="flex justify-between items-center mb-8">
                <span className="text-slate-500 font-medium text-sm">결제 주기</span>
                <span className="text-white font-bold">월간 결제</span>
              </div>

              <div className="pt-6 border-t border-white/10 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">최종 결제 금액</span>
                  <span className="text-2xl font-black text-cyan-400 tracking-tighter">{planPrice}</span>
                </div>
              </div>

              <button className="w-full btn-primary py-4 text-base font-black shadow-xl shadow-cyan-500/20">
                결제 완료하기
              </button>
              
              <p className="text-center text-slate-600 text-[10px] mt-4 leading-relaxed font-medium">
                결제 버튼을 클릭하면 서비스 이용약관 및 <br />
                개인정보 처리방침에 동의하는 것으로 간주됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
