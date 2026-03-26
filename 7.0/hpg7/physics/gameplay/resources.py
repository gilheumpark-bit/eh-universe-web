from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ResourceNetworkState:
    hydrogen_reserve: float
    solar_energy_reserve: float
    crystal_mass: float
    alloy_mass: float
    relay_gate_count: int
    solar_concentrator_count: int
    scoop_efficiency: float
    glg_chambers: int
    suo_crews: int
    main_gate_tier: int


@dataclass(frozen=True)
class ResourceCycleReport:
    harvested_hydrogen: float
    harvested_solar_energy: float
    resonance_charge: float
    glg_growth: float
    gate_seed_progress: float
    updated_hydrogen_reserve: float
    updated_solar_energy_reserve: float
    updated_crystal_mass: float
    updated_alloy_mass: float
    lattice_density: float
    status: str


class ResourceProductionEngine:
    def run_cycle(self, state: ResourceNetworkState, *, cycles: int = 1) -> ResourceCycleReport:
        safe_cycles = max(cycles, 1)
        harvested_hydrogen = 0.85 * state.scoop_efficiency * state.relay_gate_count * safe_cycles
        harvested_solar_energy = 14.0 * state.solar_concentrator_count * (1.0 + 0.18 * state.main_gate_tier) * safe_cycles
        resonance_charge = harvested_solar_energy * (0.08 + 0.01 * state.relay_gate_count)
        glg_growth = (0.65 * state.glg_chambers + 0.04 * state.suo_crews) * safe_cycles
        gate_seed_progress = min(
            1.0,
            (resonance_charge / 240.0) + (glg_growth / 120.0) + (state.main_gate_tier * 0.035),
        )
        updated_hydrogen_reserve = state.hydrogen_reserve + harvested_hydrogen
        updated_solar_energy_reserve = state.solar_energy_reserve + harvested_solar_energy - (glg_growth * 2.4)
        updated_crystal_mass = state.crystal_mass + glg_growth * 0.55
        updated_alloy_mass = state.alloy_mass + harvested_hydrogen * 0.18
        lattice_density = 7.0 + (updated_crystal_mass * 0.025) + (state.main_gate_tier * 0.45)
        return ResourceCycleReport(
            harvested_hydrogen=harvested_hydrogen,
            harvested_solar_energy=harvested_solar_energy,
            resonance_charge=resonance_charge,
            glg_growth=glg_growth,
            gate_seed_progress=gate_seed_progress,
            updated_hydrogen_reserve=updated_hydrogen_reserve,
            updated_solar_energy_reserve=updated_solar_energy_reserve,
            updated_crystal_mass=updated_crystal_mass,
            updated_alloy_mass=updated_alloy_mass,
            lattice_density=lattice_density,
            status=resource_status(gate_seed_progress, lattice_density),
        )


def resource_status(gate_seed_progress: float, lattice_density: float) -> str:
    if gate_seed_progress >= 0.95 and lattice_density >= 12.0:
        return "seed_ready"
    if gate_seed_progress >= 0.6:
        return "network_growing"
    return "bootstrap"
