from __future__ import annotations

from dataclasses import dataclass
from math import sqrt


@dataclass(frozen=True)
class ThermalLoopState:
    core_temperature: float
    ambient_temperature: float
    heat_input: float
    hull_mass: float
    radiator_area: float
    s_ondol_efficiency: float
    cweh_recovery: float


@dataclass(frozen=True)
class ThermalReport:
    generated_heat: float
    redistributed_heat: float
    dissipated_heat: float
    recovered_energy: float
    updated_temperature: float
    thermal_margin: float
    status: str


class ThermalManagementEngine:
    def regulate(self, state: ThermalLoopState, *, dt: float, safe_temperature: float = 360.0) -> ThermalReport:
        safe_dt = max(dt, 0.0)
        hull_heat_capacity = max(state.hull_mass * 0.85, 1e-9)
        generated_heat = state.heat_input * safe_dt
        redistributed_heat = generated_heat * clamp(state.s_ondol_efficiency, 0.0, 0.98)
        temperature_gap = max(state.core_temperature - state.ambient_temperature, 0.0)
        dissipation_factor = sqrt(temperature_gap + 1.0) * state.radiator_area * (0.12 + 0.48 * state.s_ondol_efficiency)
        dissipated_heat = min(generated_heat, dissipation_factor * safe_dt)
        recovered_energy = dissipated_heat * clamp(state.cweh_recovery, 0.0, 0.95)
        net_heat = generated_heat - dissipated_heat
        updated_temperature = state.core_temperature + (net_heat / hull_heat_capacity)
        thermal_margin = safe_temperature - updated_temperature
        return ThermalReport(
            generated_heat=generated_heat,
            redistributed_heat=redistributed_heat,
            dissipated_heat=dissipated_heat,
            recovered_energy=recovered_energy,
            updated_temperature=updated_temperature,
            thermal_margin=thermal_margin,
            status=thermal_status(updated_temperature, safe_temperature),
        )


def thermal_status(updated_temperature: float, safe_temperature: float) -> str:
    if updated_temperature <= safe_temperature * 0.82:
        return "stable"
    if updated_temperature <= safe_temperature:
        return "warning"
    return "critical"


def clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max(value, min_value), max_value)
