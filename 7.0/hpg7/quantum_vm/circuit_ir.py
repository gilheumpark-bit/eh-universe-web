from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class QuantumGate:
    name: str
    targets: tuple[int, ...]
    controls: tuple[int, ...] = ()
    parameter: float | None = None


@dataclass
class QuantumCircuit:
    qubit_count: int
    gates: list[QuantumGate] = field(default_factory=list)
    shots: int = 512

    def add_gate(
        self,
        name: str,
        *targets: int,
        controls: tuple[int, ...] = (),
        parameter: float | None = None,
    ) -> None:
        self.gates.append(
            QuantumGate(
                name=name.upper(),
                targets=tuple(targets),
                controls=controls,
                parameter=parameter,
            )
        )
