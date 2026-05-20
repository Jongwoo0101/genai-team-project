from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class FaceDetection:
    face_detected: bool
    eyes_closed: bool = False
    looking_away: bool = False
    confidence: float = 0.0


class FaceDetector:
    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path
        self._face_mesh = None

    def detect(self, frame: object) -> FaceDetection:
        import cv2
        import mediapipe as mp

        if self._face_mesh is None:
            self._face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self._face_mesh.process(rgb)
        if not result.multi_face_landmarks:
            return FaceDetection(face_detected=False)

        landmarks = result.multi_face_landmarks[0].landmark
        eyes_closed = self._eyes_closed(landmarks)
        looking_away = self._looking_away(landmarks)
        return FaceDetection(
            face_detected=True,
            eyes_closed=eyes_closed,
            looking_away=looking_away,
            confidence=0.9,
        )

    @staticmethod
    def _eyes_closed(landmarks: object) -> bool:
        left_gap = abs(landmarks[159].y - landmarks[145].y)
        right_gap = abs(landmarks[386].y - landmarks[374].y)
        return (left_gap + right_gap) / 2.0 < 0.012

    @staticmethod
    def _looking_away(landmarks: object) -> bool:
        nose_x = landmarks[1].x
        left_cheek_x = landmarks[234].x
        right_cheek_x = landmarks[454].x
        face_width = max(0.001, right_cheek_x - left_cheek_x)
        normalized_nose = (nose_x - left_cheek_x) / face_width
        return normalized_nose < 0.35 or normalized_nose > 0.65
