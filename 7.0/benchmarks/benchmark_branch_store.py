from pathlib import Path
from time import perf_counter
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hpg7.core.branch_store import CopyOnWriteBranchStore
from hpg7.core.state import ParticleState


def main() -> None:
    store = CopyOnWriteBranchStore()
    entities = {
        f"P-{index}": ParticleState(
            entity_id=f"P-{index}",
            position=(float(index), 0.0, 0.0),
            velocity=(0.0, 0.0, 0.0),
            mass=1.0,
        )
        for index in range(1_000)
    }
    root = store.create_root_branch(entities)
    start = perf_counter()
    for fork_index in range(100):
        branch = store.fork_branch(root.branch_id, reason=f"fork-{fork_index}")
        store.update_particle(
            branch.branch_id,
            ParticleState(
                entity_id="P-0",
                position=(float(fork_index), 1.0, 0.0),
                velocity=(0.1, 0.0, 0.0),
                mass=1.0,
            ),
        )
    elapsed = perf_counter() - start
    print(f"copy_on_write_100_forks_seconds={elapsed:.6f}")


if __name__ == "__main__":
    main()
