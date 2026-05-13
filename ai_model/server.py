import asyncio
import base64
import json
import logging
import os
import time
from datetime import datetime

import cv2
import numpy as np
import websockets
import ssl

# Mac 환경에서 파이썬 모델 다운로드 시 발생하는 SSL 인증 오류 방지
ssl._create_default_https_context = ssl._create_unverified_context

from src.detectors.face_detector import FaceDetector
from src.detectors.object_detector import ObjectDetector
from src.detectors.pose_detector import PoseDetector
from src.event_client import EventClient, EventPayload
from src.state_classifier import DetectionResult, StateClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MonitoringServer:
    def __init__(self, backend_url="http://localhost:8080/api"):
        self.backend_url = backend_url
        self.face_detector = FaceDetector()
        self.pose_detector = PoseDetector()
        self.object_detector = ObjectDetector()
        self.classifier = StateClassifier()
        
    async def handle_connection(self, websocket):
        logger.info("New connection established")
        employee_id = None
        event_client = None
        last_object_detection_at = 0
        last_object_detection = None

        try:
            async for message in websocket:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "init":
                    employee_id = data.get("employeeId")
                    token = data.get("token")
                    event_client = EventClient(api_base=self.backend_url, token=token)
                    logger.info(f"Initialized for employee {employee_id}")
                    await websocket.send(json.dumps({"type": "ready"}))

                elif msg_type == "frame":
                    if not employee_id:
                        continue
                    
                    # Decode base64 image
                    img_data = base64.b64decode(data.get("data"))
                    nparr = np.frombuffer(img_data, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if frame is None:
                        continue

                    now = time.monotonic()
                    
                    # Detection
                    face = self.face_detector.detect(frame)
                    pose = self.pose_detector.detect(frame)
                    
                    if now - last_object_detection_at >= 0.4:
                        last_object_detection = self.object_detector.detect(frame)
                        last_object_detection_at = now

                    phone_detected = bool(last_object_detection and last_object_detection.phone_detected)
                    phone_confidence = last_object_detection.phone_confidence if last_object_detection else 0.0

                    # Classification
                    result = self.classifier.update(
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
                        now=now,
                    )

                    # Send result back to frontend
                    await websocket.send(json.dumps({
                        "type": "result",
                        "state": result.confirmed_status,
                        "confidence": result.confidence / 100.0,
                        "fps": 0, # Not used in frontend currently
                    }))

                    # Report to backend if status changed and it's not NORMAL
                    if result.should_report:
                        payload = EventPayload(
                            employee_id=employee_id,
                            event_type=result.confirmed_status,
                            confidence=result.confidence,
                            detected_at=result.detected_at,
                        )
                        try:
                            event_client.report(payload)
                            logger.info(f"Reported event {result.confirmed_status} for employee {employee_id}")
                        except Exception as e:
                            logger.error(f"Failed to report event: {e}")

                elif msg_type == "stop":
                    logger.info(f"Stop request received for employee {employee_id}")
                    break

        except websockets.exceptions.ConnectionClosed:
            logger.info("Connection closed by client")
        except Exception as e:
            logger.error(f"Error in handle_connection: {e}")
        finally:
            logger.info("Connection handler finished")

async def main():
    server = MonitoringServer()
    async with websockets.serve(server.handle_connection, "localhost", 8765):
        logger.info("WebSocket server started on ws://localhost:8765/ws/monitor")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
