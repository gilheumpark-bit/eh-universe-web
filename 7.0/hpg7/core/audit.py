from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AuditEvent:
    label: str
    payload: dict[str, object]


@dataclass
class AuditLog:
    events: list[AuditEvent] = field(default_factory=list)

    def record(self, label: str, payload: dict[str, object]) -> None:
        self.events.append(AuditEvent(label=label, payload=dict(payload)))
