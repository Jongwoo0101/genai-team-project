#!/bin/bash

echo "🚀 Starting WorkSight Local Environment..."

# 로그 저장 디렉토리 생성
mkdir -p logs

echo "✅ Logs will be saved to the './logs' directory."
echo "   - Backend Log: ./logs/backend.log"
echo "   - AI Server Log: ./logs/ai_server.log"
echo "   - Frontend Log: ./logs/frontend.log"
echo "------------------------------------------------------"

# 1. Backend 시작
echo "✅ [1/3] Starting Backend (Spring Boot)..."
cd backend
./gradlew bootRun > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 백엔드가 포트를 바인딩하고 가동될 준비가 될 때까지 5초간 대기합니다.
echo "⏳ Waiting 5 seconds for Backend to initialize and open port 8080..."
sleep 5

# 2. AI Server 시작 (가상환경 활성화 포함)
echo "✅ [2/3] Starting AI Server (Python)..."
cd ai_model
source .venv/bin/activate
python server.py > ../logs/ai_server.log 2>&1 &
AI_PID=$!
cd ..

# 3. Frontend 시작
echo "✅ [3/3] Starting Frontend (React/Vite)..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "======================================================"
echo "🎉 All services are starting up in the background!"
echo "   - Backend PID: $BACKEND_PID"
echo "   - AI Server PID: $AI_PID"
echo "   - Frontend PID: $FRONTEND_PID"
echo ""
echo "💡 To view logs, run:"
echo "   - Tail backend: tail -f logs/backend.log"
echo "   - Tail AI server: tail -f logs/ai_server.log"
echo "   - Tail frontend: tail -f logs/frontend.log"
echo "🛑 Press [Ctrl + C] to stop all services at once."
echo "======================================================"

# Ctrl+C 입력 시 백그라운드로 실행된 모든 프로세스 종료
trap "echo '🛑 Stopping all services...'; kill $BACKEND_PID $AI_PID $FRONTEND_PID; exit" INT TERM

# 스크립트가 종료되지 않고 대기하도록 설정
wait
