from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Phase(str, Enum):
    BOOT = "boot"
    SIMULATE = "simulate"
    STREAM = "stream"
    FINALIZE = "finalize"


@dataclass
class SimulationScheduler:
    completed_phases: list[Phase] = field(default_factory=list)

    def run_phase(self, phase: Phase) -> None:
        self.completed_phases.append(phase)
