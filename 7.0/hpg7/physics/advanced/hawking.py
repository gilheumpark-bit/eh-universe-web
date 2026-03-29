from __future__ import annotations

from dataclasses import dataclass
from math import pi, sqrt

from hpg7.core.state import BlackHoleState


@dataclass(frozen=True)
class HawkingStep:
    emitted_energy: float
    mass_delta: float
    updated_mass: float
    updated_entropy: float
    information_retained: float
    horizon_radius: float
    temperature: float
    paradox_gap: float
    horizon_area: float
    page_fraction: float
    page_time_reached: bool


@dataclass(frozen=True)
class HawkingHistoryPoint:
    step: int
    mass: float
    entropy: float
    information_retained: float
    temperature: float
    paradox_gap: float
    horizon_area: float
    page_fraction: float
    page_time_reached: bool


class HawkingRadiationModel:
    def __init__(self, initial_mass: float = 12.0, evaporation_acceleration: float = 5e5) -> None:
        self.initial_mass = initial_mass
        self.evaporation_acceleration = evaporation_acceleration
        # Natural units with a scaled luminosity factor so short demos still evolve visibly.
        self.stefan_boltzmann = (pi * pi) / 60.0

    def _geometry(self, mass: float, spin: float, charge: float) -> tuple[float, float, float, float]:
        mass = max(mass, 1e-9)
        a = min(abs(spin), 0.999) * mass
        extremal_charge = sqrt(max((mass * mass) - (a * a), 0.0))
        effective_charge = min(abs(charge), extremal_charge * 0.95)
        discriminant = max((mass * mass) - (a * a) - (effective_charge * effective_charge), 1e-12)
        root = sqrt(discriminant)
        r_plus = mass + root
        r_minus = mass - root
        area = 4.0 * pi * ((r_plus * r_plus) + (a * a))
        return effective_charge, r_plus, r_minus, area

    def _raw_entropy(self, mass: float, spin: float, charge: float) -> float:
        _, r_plus, _, area = self._geometry(mass, spin, charge)
        if area <= 0.0:
            return pi * r_plus * r_plus
        return area * 0.25

    def _entropy_scale(self, black_hole: BlackHoleState) -> float:
        raw_entropy = max(self._raw_entropy(black_hole.mass, black_hole.spin, black_hole.charge), 1e-9)
        return black_hole.entropy / raw_entropy

    def _page_fraction(self, initial_entropy: float, current_entropy: float) -> float:
        if initial_entropy <= 0.0:
            return 0.0
        fraction = (initial_entropy - current_entropy) / initial_entropy
        return clamp_scalar(fraction, 0.0, 1.0)

    def get_temperature(self, mass: float, spin: float = 0.0, charge: float = 0.0) -> float:
        _, r_plus, r_minus, _ = self._geometry(mass, spin, charge)
        denominator = max(4.0 * pi * (((r_plus * r_plus) + (min(abs(spin), 0.999) * mass) ** 2)), 1e-12)
        return (r_plus - r_minus) / denominator

    def get_luminosity(self, mass: float, spin: float = 0.0, charge: float = 0.0) -> float:
        effective_charge, _, _, area = self._geometry(mass, spin, charge)
        temperature = self.get_temperature(mass, spin, charge)
        spin_suppression = 1.0 - 0.2 * min(abs(spin), 0.95)
        charge_suppression = 1.0 - 0.1 * min(effective_charge / max(mass, 1e-9), 0.95)
        greybody_factor = max(spin_suppression * charge_suppression, 0.15)
        luminosity = self.stefan_boltzmann * area * (temperature**4) * greybody_factor
        return luminosity * self.evaporation_acceleration

    def _evaporate_step(
        self,
        black_hole: BlackHoleState,
        *,
        ambient_entropy: float,
        dt: float,
        entropy_scale: float,
        initial_entropy: float,
    ) -> HawkingStep:
        mass = max(black_hole.mass, 1e-9)
        temp = self.get_temperature(mass, black_hole.spin, black_hole.charge)
        luminosity = self.get_luminosity(mass, black_hole.spin, black_hole.charge)
        mass_delta = min(luminosity * max(dt, 0.0), mass * 0.25)
        updated_mass = max(mass - mass_delta, 0.0)

        _, r_plus, _, area = self._geometry(updated_mass, black_hole.spin, black_hole.charge)
        updated_entropy = self._raw_entropy(updated_mass, black_hole.spin, black_hole.charge) * entropy_scale
        page_fraction = self._page_fraction(initial_entropy, updated_entropy)
        page_time_reached = page_fraction >= 0.5

        post_page_progress = clamp_scalar((page_fraction - 0.5) / 0.5, 0.0, 1.0)
        smooth_release = post_page_progress * post_page_progress * (3.0 - 2.0 * post_page_progress)
        ambient_noise = ambient_entropy / max(ambient_entropy + updated_entropy, 1e-9)
        release_efficiency = (0.08 + 0.84 * smooth_release) * (1.0 - 0.35 * ambient_noise)
        information_retained = max(
            black_hole.information_budget
            - (black_hole.information_budget * (mass_delta / mass) * release_efficiency),
            0.0,
        )
        paradox_gap = max(updated_entropy - information_retained, 0.0)

        return HawkingStep(
            emitted_energy=mass_delta,
            mass_delta=mass_delta,
            updated_mass=updated_mass,
            updated_entropy=updated_entropy,
            information_retained=information_retained,
            horizon_radius=r_plus,
            temperature=temp,
            paradox_gap=paradox_gap,
            horizon_area=area,
            page_fraction=page_fraction,
            page_time_reached=page_time_reached,
        )

    def evaporate_step(self, black_hole: BlackHoleState, ambient_entropy: float, dt: float) -> HawkingStep:
        entropy_scale = self._entropy_scale(black_hole)
        return self._evaporate_step(
            black_hole,
            ambient_entropy=ambient_entropy,
            dt=dt,
            entropy_scale=entropy_scale,
            initial_entropy=black_hole.entropy,
        )

    def simulate_history(
        self,
        black_hole: BlackHoleState,
        *,
        ambient_entropy: float,
        dt: float,
        steps: int,
    ) -> list[HawkingHistoryPoint]:
        entropy_scale = self._entropy_scale(black_hole)
        initial_entropy = black_hole.entropy
        current = black_hole
        history: list[HawkingHistoryPoint] = []
        for step in range(steps):
            _, _, _, horizon_area = self._geometry(current.mass, current.spin, current.charge)
            current_page_fraction = self._page_fraction(initial_entropy, current.entropy)
            history.append(
                HawkingHistoryPoint(
                    step=step,
                    mass=current.mass,
                    entropy=current.entropy,
                    information_retained=current.information_budget,
                    temperature=self.get_temperature(current.mass, current.spin, current.charge),
                    paradox_gap=max(current.entropy - current.information_budget, 0.0),
                    horizon_area=horizon_area,
                    page_fraction=current_page_fraction,
                    page_time_reached=current_page_fraction >= 0.5,
                )
            )
            update = self._evaporate_step(
                current,
                ambient_entropy=ambient_entropy,
                dt=dt,
                entropy_scale=entropy_scale,
                initial_entropy=initial_entropy,
            )
            current = BlackHoleState(
                entity_id=current.entity_id,
                mass=update.updated_mass,
                spin=current.spin,
                charge=current.charge,
                entropy=update.updated_entropy,
                information_budget=update.information_retained,
            )
            if current.mass <= 1e-6:
                break
        return history


def clamp_scalar(value: float, min_value: float, max_value: float) -> float:
    return min(max(value, min_value), max_value)
