import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.state_classifier import DetectionResult, StateClassifier


class StateClassifierTest(unittest.TestCase):
    def test_sleep_is_confirmed_only_after_threshold(self):
        classifier = StateClassifier()

        first = classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, eyes_closed=True),
            now=0.0,
        )
        early = classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, eyes_closed=True),
            now=1.0,
        )
        confirmed = classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, eyes_closed=True),
            now=2.1,
        )

        self.assertEqual(first.confirmed_status, "NORMAL")
        self.assertEqual(early.confirmed_status, "NORMAL")
        self.assertEqual(confirmed.confirmed_status, "SLEEP")
        self.assertTrue(confirmed.should_report)

    def test_smartphone_is_confirmed_after_one_second(self):
        classifier = StateClassifier()

        classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, phone_detected=True, phone_confidence=0.83),
            now=10.0,
        )
        confirmed = classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, phone_detected=True, phone_confidence=0.86),
            now=11.1,
        )

        self.assertEqual(confirmed.confirmed_status, "SMARTPHONE")
        self.assertEqual(confirmed.confidence, 86)
        self.assertTrue(confirmed.should_report)

    def test_away_requires_ten_seconds_without_face_or_pose(self):
        classifier = StateClassifier()

        classifier.update(DetectionResult(face_detected=False, pose_detected=False), now=20.0)
        early = classifier.update(DetectionResult(face_detected=False, pose_detected=False), now=29.5)
        confirmed = classifier.update(DetectionResult(face_detected=False, pose_detected=False), now=30.2)

        self.assertEqual(early.confirmed_status, "NORMAL")
        self.assertEqual(confirmed.confirmed_status, "AWAY")
        self.assertTrue(confirmed.should_report)

    def test_duplicate_abnormal_status_is_suppressed_until_cooldown_expires(self):
        classifier = StateClassifier(report_cooldown_seconds=30.0)

        first = classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, phone_detected=True, phone_confidence=0.9),
            now=0.0,
        )
        second = classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, phone_detected=True, phone_confidence=0.9),
            now=1.1,
        )
        duplicate = classifier.update(
            DetectionResult(face_detected=True, pose_detected=True, phone_detected=True, phone_confidence=0.91),
            now=5.0,
        )

        self.assertFalse(first.should_report)
        self.assertTrue(second.should_report)
        self.assertEqual(duplicate.confirmed_status, "SMARTPHONE")
        self.assertFalse(duplicate.should_report)


if __name__ == "__main__":
    unittest.main()
