from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class PoseDetection:
    pose_detected: bool
    confidence: float = 0.0


class PoseDetector:
    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path
        self._pose = None

    def detect(self, frame: object) -> PoseDetection:
        import cv2
        import mediapipe as mp
        import mediapipe.python.solutions.pose as mp_pose

        if self._pose is None:
            self._pose = mp_pose.Pose(
                static_image_mode=False,
                model_complexity=0,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self._pose.process(rgb)
        if not result.pose_landmarks:
            return PoseDetection(pose_detected=False)

        visible = [
            landmark.visibility
            for landmark in result.pose_landmarks.landmark
            if getattr(landmark, "visibility", 0.0) >= 0.5
        ]
        confidence = sum(visible) / len(visible) if visible else 0.5
        return PoseDetection(pose_detected=True, confidence=confidence)
