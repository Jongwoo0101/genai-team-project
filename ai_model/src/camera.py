from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator


@dataclass(frozen=True)
class CameraFrame:
    image: object
    timestamp_seconds: float


class Camera:
    def __init__(self, camera_index: int = 0, width: int = 1280, height: int = 720) -> None:
        import cv2

        self._cv2 = cv2
        self._capture = cv2.VideoCapture(camera_index)
        self._capture.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self._capture.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        if not self._capture.isOpened():
            raise RuntimeError(f"Unable to open camera index {camera_index}")

    def frames(self) -> Iterator[CameraFrame]:
        while True:
            ok, frame = self._capture.read()
            if not ok:
                raise RuntimeError("Unable to read frame from camera")
            yield CameraFrame(image=frame, timestamp_seconds=self._cv2.getTickCount() / self._cv2.getTickFrequency())

    def release(self) -> None:
        self._capture.release()
