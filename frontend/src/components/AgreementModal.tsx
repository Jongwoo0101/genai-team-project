import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  terms: string;
  targetPath: string;
}

export default function AgreementModal({ isOpen, onClose, title, description, terms, targetPath }: AgreementModalProps) {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleProceed = () => {
    if (agreed) {
      navigate(targetPath);
      onClose(); // Optional, since we navigate away, but good practice
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>

        {/* Terms Content */}
        <div className="p-6 bg-slate-950/50 h-48 overflow-y-auto">
          <div className="prose prose-invert prose-sm">
            <h3 className="text-white font-semibold mb-2">이용 동의서 (Terms of Service)</h3>
            <p className="text-slate-400 whitespace-pre-wrap text-xs leading-relaxed">
              {terms}
            </p>
          </div>
        </div>

        {/* Footer & Actions */}
        <div className="p-6 border-t border-white/5">
          <label className="flex items-start gap-3 cursor-pointer group mb-6">
            <div className="relative flex items-center justify-center mt-0.5">
              <input 
                type="checkbox" 
                className="peer sr-only"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <div className="w-5 h-5 rounded border border-slate-600 bg-slate-800 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-colors" />
              <svg 
                className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors select-none">
              본인은 위 서비스 안내 및 개인정보 처리방침 등 이용약관에 동의합니다.
            </span>
          </label>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              취소
            </button>
            <button 
              onClick={handleProceed}
              disabled={!agreed}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                agreed 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 cursor-pointer' 
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              }`}
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
