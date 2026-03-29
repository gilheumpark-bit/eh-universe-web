from __future__ import annotations

from dataclasses import replace

from hpg7.core.state import BranchDelta, BranchState, BranchTreeNode, ParticleState


class CopyOnWriteBranchStore:
    def __init__(self) -> None:
        self.root_entities: dict[str, ParticleState] = {}
        self.branches: dict[str, BranchState] = {}
        self._next_branch_index = 1

    def create_root_branch(self, entities: dict[str, ParticleState]) -> BranchState:
        self.root_entities = dict(entities)
        root = BranchState(branch_id="BRANCH-0", parent_id=None, probability=1.0)
        self.branches[root.branch_id] = root
        return root

    def fork_branch(self, parent_id: str, reason: str) -> BranchState:
        parent = self.branches[parent_id]
        parent_probability = parent.probability * 0.5
        self.branches[parent_id] = replace(parent, probability=parent_probability)

        child_id = f"BRANCH-{self._next_branch_index}"
        self._next_branch_index += 1
        child = BranchState(
            branch_id=child_id,
            parent_id=parent_id,
            probability=parent_probability,
            metadata={"reason": reason},
        )
        self.branches[child_id] = child
        return child

    def get_branch(self, branch_id: str) -> BranchState:
        return self.branches[branch_id]

    def update_particle(self, branch_id: str, particle: ParticleState) -> None:
        branch = self.branches[branch_id]
        overlay = dict(branch.overlay)
        overlay[particle.entity_id] = particle
        self.branches[branch_id] = replace(branch, overlay=overlay)

    def remove_particle(self, branch_id: str, entity_id: str) -> None:
        branch = self.branches[branch_id]
        disabled = set(branch.disabled_entities)
        disabled.add(entity_id)
        overlay = dict(branch.overlay)
        overlay.pop(entity_id, None)
        self.branches[branch_id] = replace(
            branch,
            overlay=overlay,
            disabled_entities=frozenset(disabled),
        )

    def update_branch_metadata(self, branch_id: str, **metadata: object) -> None:
        branch = self.branches[branch_id]
        merged = dict(branch.metadata)
        merged.update(metadata)
        self.branches[branch_id] = replace(branch, metadata=merged)

    def prune_branch(self, branch_id: str, *, reason: str, score: float) -> None:
        branch = self.branches[branch_id]
        merged = dict(branch.metadata)
        merged.update(
            {
                "pruned": True,
                "prune_reason": reason,
                "consistency_score": round(score, 6),
            }
        )
        self.branches[branch_id] = replace(branch, probability=0.0, metadata=merged)

    def lineage(self, branch_id: str) -> list[BranchState]:
        branch_lineage: list[BranchState] = []
        cursor = self.branches[branch_id]
        while cursor is not None:
            branch_lineage.append(cursor)
            if cursor.parent_id is None:
                cursor = None
            else:
                cursor = self.branches[cursor.parent_id]
        return branch_lineage

    def snapshot_branch(self, branch_id: str) -> dict[str, ParticleState]:
        branch_lineage = self.lineage(branch_id)
        snapshot = dict(self.root_entities)
        for branch in reversed(branch_lineage):
            for entity_id in branch.disabled_entities:
                snapshot.pop(entity_id, None)
            snapshot.update(branch.overlay)
        return snapshot

    def active_branches(self) -> list[BranchState]:
        return sorted(
            [branch for branch in self.branches.values() if branch.probability > 0.0],
            key=lambda branch: (-branch.probability, branch.branch_id),
        )

    def branch_delta(self, branch_id: str) -> BranchDelta:
        branch = self.branches[branch_id]
        parent_probability = 0.0
        if branch.parent_id is not None:
            parent_probability = self.branches[branch.parent_id].probability
        return BranchDelta(
            parent_id=branch.parent_id,
            branch_id=branch.branch_id,
            parent_probability=parent_probability,
            branch_probability=branch.probability,
            changed_entities=tuple(sorted(branch.overlay.keys())),
            removed_entities=tuple(sorted(branch.disabled_entities)),
        )

    def build_branch_tree(self) -> list[BranchTreeNode]:
        children_by_parent: dict[str | None, list[str]] = {}
        for branch in self.branches.values():
            children_by_parent.setdefault(branch.parent_id, []).append(branch.branch_id)

        tree: list[BranchTreeNode] = []
        for branch_id in sorted(self.branches):
            branch = self.branches[branch_id]
            depth = len(self.lineage(branch_id)) - 1
            child_ids = tuple(sorted(children_by_parent.get(branch_id, [])))
            entity_count = len(self.snapshot_branch(branch_id))
            tree.append(
                BranchTreeNode(
                    branch_id=branch.branch_id,
                    parent_id=branch.parent_id,
                    depth=depth,
                    probability=branch.probability,
                    child_ids=child_ids,
                    entity_count=entity_count,
                    metadata=dict(branch.metadata),
                )
            )
        return tree
