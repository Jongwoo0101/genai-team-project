from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from urllib import request


@dataclass(frozen=True)
class EventPayload:
    employee_id: int
    event_type: str       # WORKING | FOCUS | AWAY
    confidence: int
    detected_at: datetime
    source: str = "ai_model"


class EventClient:
    def __init__(self, api_base: str, token: Optional[str] = None, timeout_seconds: float = 3.0) -> None:
        self.api_base = api_base.rstrip("/")
        self.token = token
        self.timeout_seconds = timeout_seconds

    def report(self, payload: EventPayload) -> None:
        # MEETING 상태는 AI 모델이 직접 보고하면 백엔드에서 400 에러가 나므로, 전송하지 않고 리턴합니다.
        if payload.event_type == "MEETING":
            return

        # BREAK 상태가 넘어올 경우 하위 호환을 위해 AWAY로 보정합니다.
        event_type = "AWAY" if payload.event_type == "BREAK" else payload.event_type

        # PUT /api/status/ai — AiStatusUpdateRequest: { statusType }
        body = json.dumps(
            {"statusType": event_type}
        ).encode("utf-8")

        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = request.Request(
            f"{self.api_base}/status/ai",
            data=body,
            headers=headers,
            method="PUT",
        )
        with request.urlopen(req, timeout=self.timeout_seconds) as response:
            response.read()
