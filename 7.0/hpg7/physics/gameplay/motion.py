from __future__ import annotations

from dataclasses import dataclass
from math import sqrt

from hpg7.core.state import ParticleState, Vector3


@dataclass(frozen=True)
class MotionFrame:
    entity_id: str
    start_position: Vector3
    updated_position: Vector3
    updated_velocity: Vector3
    applied_acceleration: Vector3
    speed: float
    kinetic_energy: float
    drift_ratio: float


class KinematicsEngine:
    def integrate_particle(
        self,
        particle: ParticleState,
        *,
        thrust: Vector3,
        dt: float,
        drag: float = 0.0,
    ) -> MotionFrame:
        safe_dt = max(dt, 0.0)
        safe_mass = max(particle.mass, 1e-9)
        drag_scale = max(0.0, min(1.0 - drag * safe_dt, 1.0))
        base_velocity = tuple(component * drag_scale for component in particle.velocity)
        acceleration = tuple(component / safe_mass for component in thrust)
        updated_velocity = tuple(
            velocity_component + acceleration_component * safe_dt
            for velocity_component, acceleration_component in zip(base_velocity, acceleration)
        )
        updated_position = tuple(
            position_component
            + velocity_component * safe_dt
            + 0.5 * acceleration_component * safe_dt * safe_dt
            for position_component, velocity_component, acceleration_component in zip(
                particle.position,
                base_velocity,
                acceleration,
            )
        )
        speed = vector_magnitude(updated_velocity)
        kinetic_energy = 0.5 * safe_mass * speed * speed
        drift_ratio = speed / max(vector_magnitude(thrust), 1e-9)
        return MotionFrame(
            entity_id=particle.entity_id,
            start_position=particle.position,
            updated_position=updated_position,
            updated_velocity=updated_velocity,
            applied_acceleration=acceleration,
            speed=speed,
            kinetic_energy=kinetic_energy,
            drift_ratio=drift_ratio,
        )


def vector_magnitude(vector: Vector3) -> float:
    return sqrt(sum(component * component for component in vector))
