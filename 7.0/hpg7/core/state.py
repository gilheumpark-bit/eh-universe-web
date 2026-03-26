from __future__ import annotations

from dataclasses import dataclass, field


Vector3 = tuple[float, float, float]


@dataclass(frozen=True)
class ParticleState:
    entity_id: str
    position: Vector3
    velocity: Vector3
    mass: float
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class BlackHoleState:
    entity_id: str
    mass: float
    spin: float
    charge: float
    entropy: float
    information_budget: float


@dataclass(frozen=True)
class BranchState:
    branch_id: str
    parent_id: str | None
    probability: float
    overlay: dict[str, ParticleState] = field(default_factory=dict)
    disabled_entities: frozenset[str] = field(default_factory=frozenset)
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class BranchTreeNode:
    branch_id: str
    parent_id: str | None
    depth: int
    probability: float
    child_ids: tuple[str, ...]
    entity_count: int
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class BranchDelta:
    parent_id: str | None
    branch_id: str
    parent_probability: float
    branch_probability: float
    changed_entities: tuple[str, ...]
    removed_entities: tuple[str, ...]
