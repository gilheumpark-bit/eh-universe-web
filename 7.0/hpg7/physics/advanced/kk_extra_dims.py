from __future__ import annotations

from dataclasses import dataclass
from math import pi, sqrt


@dataclass(frozen=True)
class KaluzaKleinProjection:
    extra_dimension_radius: float
    effective_gravity: float
    effective_electromagnetism: float
    coupling_balance: float
    scalar_mode: float
    effective_charge: float
    compactification_energy: float
    mode_mass: float
    gauge_mixing: float
    mode_wavelength: float


class KaluzaKleinModule:
    def __init__(self, compact_radius: float = 1e-18, reference_radius: float = 1e-18) -> None:
        self.compact_radius = compact_radius
        self.reference_radius = reference_radius

    def _radius_ratio(self) -> float:
        return max(self.compact_radius / max(self.reference_radius, 1e-30), 1e-9)

    def project_field(
        self,
        curvature: float,
        electromagnetic_potential: float,
        *,
        scalar_mode: float = 1.0,
        mode_index: int = 1,
    ) -> KaluzaKleinProjection:
        radius_ratio = self._radius_ratio()
        compactification_energy = mode_index / radius_ratio
        geometric_prefactor = 1.0 / sqrt(2.0 * pi * radius_ratio)
        gauge_mixing = scalar_mode / sqrt((scalar_mode * scalar_mode) + (compactification_energy * compactification_energy))
        effective_gravity = curvature * geometric_prefactor
        effective_electromagnetism = electromagnetic_potential * gauge_mixing * geometric_prefactor
        coupling_balance = 1.0 / (1.0 + abs(effective_gravity - effective_electromagnetism))
        effective_charge = electromagnetic_potential * sqrt(max(mode_index, 1)) * gauge_mixing
        mode_mass = sqrt((scalar_mode * curvature) ** 2 + compactification_energy**2)
        mode_wavelength = (2.0 * pi * self.compact_radius) / max(mode_index, 1)
        return KaluzaKleinProjection(
            extra_dimension_radius=self.compact_radius,
            effective_gravity=effective_gravity,
            effective_electromagnetism=effective_electromagnetism,
            coupling_balance=coupling_balance,
            scalar_mode=scalar_mode,
            effective_charge=effective_charge,
            compactification_energy=compactification_energy,
            mode_mass=mode_mass,
            gauge_mixing=gauge_mixing,
            mode_wavelength=mode_wavelength,
        )

    def scan_modes(
        self,
        curvature: float,
        electromagnetic_potential: float,
        *,
        mode_count: int = 5,
    ) -> list[KaluzaKleinProjection]:
        projections: list[KaluzaKleinProjection] = []
        for mode_index in range(1, mode_count + 1):
            scalar_mode = 1.0 + mode_index * 0.15
            projections.append(
                self.project_field(
                    curvature,
                    electromagnetic_potential,
                    scalar_mode=scalar_mode,
                    mode_index=mode_index,
                )
            )
        return projections
