# WorkSight AI Local Monitor

Local webcam-based AI monitor for WorkSight.

## Setup

```bash
cd ai_model
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

The module is designed so classifier tests run without heavy ML packages installed. Runtime camera detection needs OpenCV, MediaPipe, and Ultralytics.

## Run (Local WebSocket Server)

For the frontend integration (React web app -> Local Agent), run the WebSocket server:

```bash
python -m ai_model.server
# or
python server.py --backend-url http://localhost:8080
```

> **Note:** The server must be running before clicking "AI 모니터링 시작" in the frontend.

## Run (Standalone CLI)

```bash
python -m src.main \
  --employee-id 1 \
  --token "<employee-jwt>" \
  --api-base http://localhost:8080/api
```

Optional flags:

- `--camera-index 0`
- `--show-preview`
- `--dry-run`
- `--face-model models/face_landmarker.task`
- `--pose-model models/pose_landmarker.task`
- `--yolo-model yolo26n.pt`

## Behavior

- `NORMAL` is not sent to the server.
- Abnormal statuses are sent only after they remain stable for their threshold.
- Duplicate abnormal events are suppressed by cooldown.
- Original frames stay on the employee PC in the MVP.
