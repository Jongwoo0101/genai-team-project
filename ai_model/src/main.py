from __future__ import annotations

import argparse
import time

from .camera import Camera
from .detectors.face_detector import FaceDetector
from .detectors.object_detector import ObjectDetector
from .detectors.pose_detector import PoseDetector
from .event_client import EventClient, EventPayload
from .state_classifier import DetectionResult, StateClassifier


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run WorkSight local AI monitoring")
    parser.add_argument("--employee-id", type=int, required=True)
    parser.add_argument("--token", default=None)
    parser.add_argument("--api-base", default="http://localhost:8080/api")
    parser.add_argument("--camera-index", type=int, default=0)
    parser.add_argument("--yolo-model", default="yolo26n.pt")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--show-preview", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    camera = Camera(camera_index=args.camera_index)
    face_detector = FaceDetector()
    pose_detector = PoseDetector()
    object_detector = ObjectDetector(model_name=args.yolo_model)
    classifier = StateClassifier()
    event_client = EventClient(api_base=args.api_base, token=args.token)

    import cv2

    last_object_detection_at = 0.0
    last_object_detection = None

    try:
        for frame in camera.frames():
            face = face_detector.detect(frame.image)
            pose = pose_detector.detect(frame.image)

            if frame.timestamp_seconds - last_object_detection_at >= 0.4:
                last_object_detection = object_detector.detect(frame.image)
                last_object_detection_at = frame.timestamp_seconds

            phone_detected = bool(last_object_detection and last_object_detection.phone_detected)
            phone_confidence = last_object_detection.phone_confidence if last_object_detection else 0.0
            result = classifier.update(
                DetectionResult(
                    face_detected=face.face_detected,
                    pose_detected=pose.pose_detected,
                    eyes_closed=face.eyes_closed,
                    looking_away=face.looking_away,
                    phone_detected=phone_detected,
                    phone_confidence=phone_confidence,
                    face_confidence=face.confidence,
                    pose_confidence=pose.confidence,
                ),
                now=time.monotonic(),
            )

            if result.should_report:
                payload = EventPayload(
                    employee_id=args.employee_id,
                    event_type=result.confirmed_status,
                    confidence=result.confidence,
                    detected_at=result.detected_at,
                )
                if args.dry_run:
                    print(payload)
                else:
                    event_client.report(payload)

            if args.show_preview:
                cv2.putText(
                    frame.image,
                    f"{result.confirmed_status} {result.confidence}%",
                    (24, 48),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.0,
                    (0, 255, 255),
                    2,
                )
                cv2.imshow("WorkSight AI", frame.image)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    finally:
        camera.release()
        if args.show_preview:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
