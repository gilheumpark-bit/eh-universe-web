from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CommandPacket:
    packet_type: str
    step: int
    metrics: dict[str, object]
    branch_tree: list[object] = field(default_factory=list)
    audit_labels: list[str] = field(default_factory=list)
    branch_delta: object | None = None
    payload: dict[str, object] | None = None
