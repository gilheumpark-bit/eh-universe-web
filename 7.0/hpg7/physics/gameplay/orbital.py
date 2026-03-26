from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi, sin, sqrt


@dataclass(frozen=True)
class OrbitalReport:
    central_mass: float
    orbital_radius_km: float
    orbital_speed_km_s: float
    escape_velocity_km_s: float
    orbital_period_s: float
    updated_angle_deg: float
    position_xy_km: tuple[float, float]
    velocity_xy_km_s: tuple[float, float]
    status: str


class OrbitalMechanicsEngine:
    def __init__(self, gravitational_constant: float = 6.67430e-20) -> None:
        self.gravitational_constant = gravitational_constant

    def propagate_circular_orbit(
        self,
        *,
        central_mass: float,
        orbital_radius_km: float,
        dt: float,
        initial_angle_deg: float = 0.0,
    ) -> OrbitalReport:
        safe_radius = max(orbital_radius_km, 1e-6)
        mu = self.gravitational_constant * max(central_mass, 1e-9)
        orbital_speed = sqrt(mu / safe_radius)
        escape_velocity = sqrt(2.0 * mu / safe_radius)
        orbital_period = 2.0 * pi * sqrt((safe_radius**3) / max(mu, 1e-12))
        mean_motion = orbital_speed / safe_radius
        updated_angle_rad = (initial_angle_deg * pi / 180.0) + mean_motion * max(dt, 0.0)
        updated_angle_deg = (updated_angle_rad * 180.0 / pi) % 360.0
        position_xy = (
            safe_radius * cos(updated_angle_rad),
            safe_radius * sin(updated_angle_rad),
        )
        velocity_xy = (
            -orbital_speed * sin(updated_angle_rad),
            orbital_speed * cos(updated_angle_rad),
        )
        return OrbitalReport(
            central_mass=central_mass,
            orbital_radius_km=safe_radius,
            orbital_speed_km_s=orbital_speed,
            escape_velocity_km_s=escape_velocity,
            orbital_period_s=orbital_period,
            updated_angle_deg=updated_angle_deg,
            position_xy_km=position_xy,
            velocity_xy_km_s=velocity_xy,
            status="bound" if orbital_speed < escape_velocity else "escape",
        )
