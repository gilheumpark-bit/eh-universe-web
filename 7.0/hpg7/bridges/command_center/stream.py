from __future__ import annotations

from dataclasses import asdict, is_dataclass
import json

from hpg7.bridges.command_center.protocol import CommandPacket


class CommandCenterBridge:
    def _json_safe(self, value: object) -> object:
        if is_dataclass(value):
            return {key: self._json_safe(item) for key, item in asdict(value).items()}
        if isinstance(value, dict):
            return {str(key): self._json_safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [self._json_safe(item) for item in value]
        return value

    def _serialize(self, packet: CommandPacket) -> str:
        return json.dumps(self._json_safe(packet), sort_keys=True)

    def build_snapshot(
        self,
        step: int,
        metrics: dict[str, object],
        *,
        branch_tree: list[object] | None = None,
        audit_labels: list[str] | None = None,
    ) -> str:
        packet = CommandPacket(
            packet_type="snapshot",
            step=step,
            metrics=metrics,
            branch_tree=branch_tree or [],
            audit_labels=audit_labels or [],
        )
        return self._serialize(packet)

    def build_delta(
        self,
        step: int,
        metrics: dict[str, object],
        *,
        branch_delta: object | None = None,
        audit_labels: list[str] | None = None,
    ) -> str:
        packet = CommandPacket(
            packet_type="delta",
            step=step,
            metrics=metrics,
            branch_delta=branch_delta,
            audit_labels=audit_labels or [],
        )
        return self._serialize(packet)

    def build_event(self, step: int, label: str, payload: dict[str, object]) -> str:
        packet = CommandPacket(
            packet_type="event",
            step=step,
            metrics={"label": label},
            payload=payload,
        )
        return self._serialize(packet)
