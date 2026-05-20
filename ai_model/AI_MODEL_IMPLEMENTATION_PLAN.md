# WorkSight AI Model Integration Plan

## Summary

The AI module runs as a local Python process on the employee PC. It reads webcam frames locally, classifies the employee state, and sends only confirmed state-change events to the existing Spring Boot endpoint:

```text
POST /api/monitoring/event
```

The camera frames are not uploaded in the MVP. Only event metadata is sent.

## Model Choice

- MediaPipe Face Landmarker for face presence, eye closure, and head direction signals.
- MediaPipe Pose Landmarker for person presence and posture signals.
- Ultralytics YOLO26n for lightweight object detection, especially `cell phone`.

YOLO26 is licensed under AGPL-3.0 unless an enterprise license is used, so commercial deployment needs a license review.

## Runtime Flow

1. `src/main.py` opens the webcam through OpenCV.
2. Face, pose, and object detectors analyze throttled frames.
3. `StateClassifier` maps detector output to `NORMAL`, `SLEEP`, `SMARTPHONE`, `AWAY`, or `DISTRACTED`.
4. A status is confirmed only after its configured duration threshold.
5. `EventClient` sends abnormal confirmed events to the backend with confidence, detection time, and source.

## Backend Contract

Request:

```json
{
  "employeeId": 1,
  "eventType": "SLEEP",
  "confidence": 88,
  "detectedAt": "2026-05-13T10:00:00",
  "source": "ai_model"
}
```

`confidence`, `detectedAt`, and `source` are optional for compatibility with the existing frontend simulation.

## Verification

- Python classifier: `python3 -m unittest ai_model.tests.test_state_classifier`
- Backend: `cd backend && ./gradlew test`
- Frontend: `cd frontend && npm run build`
