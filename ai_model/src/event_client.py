from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from urllib import request


@dataclass(frozen=True)
class EventPayload:
    employee_id: int
    event_type: str       # WORKING | MEETING | BREAK
    confidence: int
    detected_at: datetime
    source: str = "ai_model"


class EventClient:
    def __init__(self, api_base: str, token: Optional[str] = None, timeout_seconds: float = 3.0) -> None:
        self.api_base = api_base.rstrip("/")
        self.token = token
        self.timeout_seconds = timeout_seconds

    def report(self, payload: EventPayload) -> None:
        # WORKING 상태는 기본값이므로 변경이 없을 경우 전송 생략 가능하지만,
        # 백엔드에서 상태 동기화를 위해 모든 상태 전송
        # PUT /api/status/ai — AiStatusUpdateRequest: { statusType }
        body = json.dumps(
            {"statusType": payload.event_type}
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
