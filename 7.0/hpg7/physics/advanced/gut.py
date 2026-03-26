from __future__ import annotations

from dataclasses import dataclass
from math import log, pi


@dataclass(frozen=True)
class GUTResult:
    energy_scale_gev: float
    strong_coupling: float
    weak_coupling: float
    electromagnetic_coupling: float
    unified_gap: float
    phase: str


@dataclass(frozen=True)
class GUTScalePoint:
    energy_scale_gev: float
    strong_coupling: float
    weak_coupling: float
    electromagnetic_coupling: float
    unified_gap: float
    phase: str


@dataclass(frozen=True)
class GUTScanResult:
    points: list[GUTScalePoint]
    best_unification_scale: float
    best_gap: float


class GUTRegimeModel:
    def __init__(self) -> None:
        self.reference_scale_gev = 91.1876
        # One-loop Standard Model inverse couplings at M_Z.
        self.inverse_couplings_mz = (59.01, 29.57, 8.47)
        self.beta_coefficients = (41.0 / 10.0, -19.0 / 6.0, -7.0)

    def _inverse_couplings(self, energy_scale_gev: float) -> tuple[float, float, float]:
        scale = max(energy_scale_gev, self.reference_scale_gev)
        running_log = log(scale / self.reference_scale_gev)
        inverse_couplings = []
        for initial_inverse, beta_coefficient in zip(self.inverse_couplings_mz, self.beta_coefficients):
            inverse_value = initial_inverse - (beta_coefficient / (2.0 * pi)) * running_log
            inverse_couplings.append(max(inverse_value, 1.0))
        return tuple(inverse_couplings)

    def _run_couplings(self, energy_scale_gev: float) -> tuple[float, float, float]:
        inverse_couplings = self._inverse_couplings(energy_scale_gev)
        return tuple(1.0 / inverse_value for inverse_value in inverse_couplings)

    def _phase(self, unified_gap: float, energy_scale_gev: float) -> str:
        if energy_scale_gev >= 1e14 and unified_gap < 0.006:
            return "quasi_unified"
        if energy_scale_gev >= 1e10:
            return "gut_transition"
        return "broken_symmetry"

    def evaluate(self, energy_scale_gev: float) -> GUTResult:
        strong, weak, electromagnetic = self._run_couplings(energy_scale_gev)
        unified_gap = max(strong, weak, electromagnetic) - min(strong, weak, electromagnetic)
        phase = self._phase(unified_gap, energy_scale_gev)
        return GUTResult(
            energy_scale_gev=energy_scale_gev,
            strong_coupling=round(strong, 6),
            weak_coupling=round(weak, 6),
            electromagnetic_coupling=round(electromagnetic, 6),
            unified_gap=round(unified_gap, 6),
            phase=phase,
        )

    def scan_regime(
        self,
        *,
        start_exp: int = 3,
        end_exp: int = 17,
        sample_count: int = 8,
    ) -> GUTScanResult:
        if sample_count < 2:
            sample_count = 2
        step = (end_exp - start_exp) / (sample_count - 1)
        points: list[GUTScalePoint] = []
        best_gap = float("inf")
        best_scale = 10**start_exp
        for index in range(sample_count):
            exponent = start_exp + step * index
            energy_scale_gev = 10**exponent
            result = self.evaluate(energy_scale_gev)
            point = GUTScalePoint(
                energy_scale_gev=result.energy_scale_gev,
                strong_coupling=result.strong_coupling,
                weak_coupling=result.weak_coupling,
                electromagnetic_coupling=result.electromagnetic_coupling,
                unified_gap=result.unified_gap,
                phase=result.phase,
            )
            points.append(point)
            if point.unified_gap < best_gap:
                best_gap = point.unified_gap
                best_scale = point.energy_scale_gev
        return GUTScanResult(
            points=points,
            best_unification_scale=best_scale,
            best_gap=round(best_gap, 6),
        )
