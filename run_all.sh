#!/bin/bash

echo "🚀 Starting WorkSight Local Environment..."

# 1. Backend 시작
echo "✅ [1/3] Starting Backend (Spring Boot)..."
cd backend
./gradlew bootRun &
BACKEND_PID=$!
cd ..

# 2. AI Server 시작 (가상환경 활성화 포함)
echo "✅ [2/3] Starting AI Server (Python)..."
cd ai_model
source .venv/bin/activate
python server.py &
AI_PID=$!
cd ..

# 3. Frontend 시작
echo "✅ [3/3] Starting Frontend (React/Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "======================================================"
echo "🎉 All services are starting up in the background!"
echo "   - Backend PID: $BACKEND_PID"
echo "   - AI Server PID: $AI_PID"
echo "   - Frontend PID: $FRONTEND_PID"
echo "🛑 Press [Ctrl + C] to stop all services at once."
echo "======================================================"

# Ctrl+C 입력 시 백그라운드로 실행된 모든 프로세스 종료
trap "echo '🛑 Stopping all services...'; kill $BACKEND_PID $AI_PID $FRONTEND_PID; exit" INT TERM

# 스크립트가 종료되지 않고 대기하도록 설정
wait
