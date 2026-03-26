from __future__ import annotations

from dataclasses import dataclass
from math import sqrt

from hpg7.core.state import Vector3


@dataclass(frozen=True)
class StructuralBody:
    entity_id: str
    mass: float
    radius: float
    position: Vector3
    velocity: Vector3
    hull_integrity: float
    hctg_density: float
    dpad_efficiency: float
    warp_shield_factor: float


@dataclass(frozen=True)
class CollisionReport:
    collided: bool
    pair: tuple[str, str]
    relative_speed: float
    overlap_distance: float
    impact_energy: float
    absorbed_energy: float
    residual_energy: float
    hull_damage_a: float
    hull_damage_b: float
    updated_hull_a: float
    updated_hull_b: float
    verdict: str


class StructuralCollisionEngine:
    def resolve_collision(self, body_a: StructuralBody, body_b: StructuralBody) -> CollisionReport:
        relative_position = subtract(body_a.position, body_b.position)
        distance = magnitude(relative_position)
        contact_distance = body_a.radius + body_b.radius
        overlap_distance = max(contact_distance - distance, 0.0)
        relative_velocity = subtract(body_a.velocity, body_b.velocity)
        relative_speed = magnitude(relative_velocity)
        if overlap_distance <= 0.0 or relative_speed <= 1e-9:
            return CollisionReport(
                collided=False,
                pair=(body_a.entity_id, body_b.entity_id),
                relative_speed=relative_speed,
                overlap_distance=0.0,
                impact_energy=0.0,
                absorbed_energy=0.0,
                residual_energy=0.0,
                hull_damage_a=0.0,
                hull_damage_b=0.0,
                updated_hull_a=body_a.hull_integrity,
                updated_hull_b=body_b.hull_integrity,
                verdict="clear",
            )

        reduced_mass = (body_a.mass * body_b.mass) / max(body_a.mass + body_b.mass, 1e-9)
        compression_ratio = overlap_distance / max(contact_distance, 1e-9)
        impact_energy = 0.5 * reduced_mass * relative_speed * relative_speed * (1.0 + compression_ratio)

        absorption_a = clamp(body_a.dpad_efficiency + body_a.warp_shield_factor + armor_factor(body_a.hctg_density), 0.0, 0.96)
        absorption_b = clamp(body_b.dpad_efficiency + body_b.warp_shield_factor + armor_factor(body_b.hctg_density), 0.0, 0.96)
        absorbed_energy = impact_energy * min((absorption_a + absorption_b) * 0.5, 0.97)
        residual_energy = max(impact_energy - absorbed_energy, 0.0)

        hull_damage_a = clamp(residual_energy / max(body_a.hctg_density * 48.0, 1e-9), 0.0, body_a.hull_integrity)
        hull_damage_b = clamp(residual_energy / max(body_b.hctg_density * 48.0, 1e-9), 0.0, body_b.hull_integrity)
        updated_hull_a = clamp(body_a.hull_integrity - hull_damage_a, 0.0, 1.0)
        updated_hull_b = clamp(body_b.hull_integrity - hull_damage_b, 0.0, 1.0)
        verdict = classify_hull(min(updated_hull_a, updated_hull_b))

        return CollisionReport(
            collided=True,
            pair=(body_a.entity_id, body_b.entity_id),
            relative_speed=relative_speed,
            overlap_distance=overlap_distance,
            impact_energy=impact_energy,
            absorbed_energy=absorbed_energy,
            residual_energy=residual_energy,
            hull_damage_a=hull_damage_a,
            hull_damage_b=hull_damage_b,
            updated_hull_a=updated_hull_a,
            updated_hull_b=updated_hull_b,
            verdict=verdict,
        )


def subtract(left: Vector3, right: Vector3) -> Vector3:
    return tuple(left_value - right_value for left_value, right_value in zip(left, right))


def magnitude(vector: Vector3) -> float:
    return sqrt(sum(component * component for component in vector))


def armor_factor(hctg_density: float) -> float:
    return clamp((hctg_density - 6.0) / 20.0, 0.05, 0.45)


def classify_hull(hull_integrity: float) -> str:
    if hull_integrity >= 0.75:
        return "allow"
    if hull_integrity >= 0.4:
        return "hold"
    return "deny"


def clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max(value, min_value), max_value)
