from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ObjectDetection:
    phone_detected: bool
    phone_confidence: float = 0.0


class ObjectDetector:
    def __init__(self, model_name: str = "yolo26n.pt", image_size: int = 640) -> None:
        self.model_name = model_name
        self.image_size = image_size
        self._model = None

    def detect(self, frame: object) -> ObjectDetection:
        if self._model is None:
            from ultralytics import YOLO

            self._model = YOLO(self.model_name)

        results = self._model.predict(frame, imgsz=self.image_size, verbose=False)
        best_confidence = 0.0
        for result in results:
            names = result.names
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            for box in boxes:
                class_id = int(box.cls[0])
                label = names.get(class_id, "")
                if label == "cell phone":
                    best_confidence = max(best_confidence, float(box.conf[0]))

        return ObjectDetection(phone_detected=best_confidence > 0.0, phone_confidence=best_confidence)
