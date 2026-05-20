from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional


EventType = str


@dataclass(frozen=True)
class DetectionResult:
    face_detected: bool
    pose_detected: bool
    eyes_closed: bool = False
    looking_away: bool = False
    multiple_faces: bool = False
    phone_detected: bool = False
    phone_confidence: float = 0.0
    face_confidence: float = 0.0
    pose_confidence: float = 0.0


@dataclass(frozen=True)
class ClassificationResult:
    raw_status: EventType
    confirmed_status: EventType
    confidence: int
    should_report: bool
    detected_at: datetime


class StateClassifier:
    def __init__(
        self,
        report_cooldown_seconds: float = 30.0,
        phone_threshold: float = 0.6,
        break_seconds: float = 5.0,
        meeting_seconds: float = 5.0,
        working_seconds: float = 2.0,
    ) -> None:
        self.report_cooldown_seconds = report_cooldown_seconds
        self.phone_threshold = phone_threshold
        self.thresholds: Dict[EventType, float] = {
            "BREAK": break_seconds,
            "MEETING": meeting_seconds,
            "WORKING": working_seconds,
        }
        self._candidate_status: EventType = "WORKING"
        self._candidate_since: Optional[float] = None
        self._confirmed_status: EventType = "WORKING"
        self._last_reported_at: Dict[EventType, float] = {}

    def update(self, detection: DetectionResult, now: float) -> ClassificationResult:
        raw_status = self._classify_raw(detection)
        confidence = self._confidence_for(raw_status, detection)

        if raw_status != self._candidate_status:
            self._candidate_status = raw_status
            self._candidate_since = now

        since = self._candidate_since if self._candidate_since is not None else now
        threshold = self.thresholds[raw_status]
        stable_for = now - since
        should_report = False

        if stable_for >= threshold and self._confirmed_status != raw_status:
            self._confirmed_status = raw_status
            should_report = self._can_report(raw_status, now)
            if should_report:
                self._last_reported_at[raw_status] = now
        elif raw_status == self._confirmed_status:
            should_report = False

        return ClassificationResult(
            raw_status=raw_status,
            confirmed_status=self._confirmed_status,
            confidence=confidence,
            should_report=should_report,
            detected_at=datetime.now(),
        )

    def _classify_raw(self, detection: DetectionResult) -> EventType:
        if detection.multiple_faces:
            return "MEETING"
        if detection.phone_detected and detection.phone_confidence >= self.phone_threshold:
            return "BREAK"
        if not detection.face_detected and not detection.pose_detected:
            return "BREAK"
        if detection.eyes_closed:
            return "BREAK"
        if detection.face_detected and detection.looking_away:
            return "BREAK"
        return "WORKING"

    def _confidence_for(self, status: EventType, detection: DetectionResult) -> int:
        if status == "MEETING":
            return max(self._as_percent(detection.face_confidence), 85)
        if status == "BREAK":
            if detection.phone_detected:
                return self._as_percent(detection.phone_confidence)
            if not detection.face_detected and not detection.pose_detected:
                return 90
            return 80
        return max(self._as_percent(detection.face_confidence), self._as_percent(detection.pose_confidence), 75)

    def _can_report(self, status: EventType, now: float) -> bool:
        last_reported = self._last_reported_at.get(status)
        if last_reported is None:
            return True
        return now - last_reported >= self.report_cooldown_seconds

    @staticmethod
    def _as_percent(value: float) -> int:
        return max(0, min(100, round(value * 100)))
