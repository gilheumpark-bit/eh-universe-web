from dataclasses import dataclass


@dataclass(frozen=True)
class EngineConfig:
    seed: int = 7
    enable_gameplay_systems: bool = True
    enable_extra_dimensions: bool = True
    enable_hawking_radiation: bool = True
    enable_gut_regime: bool = True
    enable_command_center: bool = True
    enable_engine_bridges: bool = True
    enable_quantum_vm: bool = True
    max_branches: int = 32
    snapshot_interval: int = 1
    use_copy_on_write: bool = True
    dashboard_host: str = "127.0.0.1"
    dashboard_port: int = 8765
    hawking_history_steps: int = 8
    gut_scan_points: int = 8
    kk_mode_count: int = 5
    resource_cycles: int = 3
    consistency_threshold: float = 0.51
    consistency_band: float = 0.005
    enable_consistency_policy: bool = True
    consistency_prune_margin: float = 0.08
