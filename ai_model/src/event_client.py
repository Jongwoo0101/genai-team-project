from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from urllib import request


@dataclass(frozen=True)
class EventPayload:
    employee_id: int
    event_type: str
    confidence: int
    detected_at: datetime
    source: str = "ai_model"


class EventClient:
    def __init__(self, api_base: str, token: Optional[str] = None, timeout_seconds: float = 3.0) -> None:
        self.api_base = api_base.rstrip("/")
        self.token = token
        self.timeout_seconds = timeout_seconds

    def report(self, payload: EventPayload) -> None:
        if payload.event_type == "NORMAL":
            return

        body = json.dumps(
            {
                "employeeId": payload.employee_id,
                "eventType": payload.event_type,
                "confidence": payload.confidence,
                "detectedAt": payload.detected_at.isoformat(timespec="seconds"),
                "source": payload.source,
            }
        ).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = request.Request(
            f"{self.api_base}/monitoring/event",
            data=body,
            headers=headers,
            method="POST",
        )
        with request.urlopen(req, timeout=self.timeout_seconds) as response:
            response.read()
