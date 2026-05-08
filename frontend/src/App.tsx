import AppRoutes from './AppRoutes';

function App() {
  const handleReset = () => {
    if (confirm('모든 로컬 데이터를 초기화하시겠습니까? (백엔드 서버 재시작 시 필요)')) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <>
      <AppRoutes />
      {/* 개발 편의를 위한 데이터 초기화 버튼 (백엔드 재시작 시 동기화 용도) */}
      <button
        onClick={handleReset}
        className="fixed bottom-4 right-4 z-[9999] px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm transition-all cursor-pointer"
      >
        🔄 데이터 초기화
      </button>
    </>
  );
}

export default App;
