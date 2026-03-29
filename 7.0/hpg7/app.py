from __future__ import annotations

from dataclasses import asdict

from hpg7.bridges.command_center import CommandCenterBridge
from hpg7.bridges.unity_bridge import UnityMaterialBridge
from hpg7.bridges.unreal_bridge import UnrealMaterialBridge
from hpg7.config import EngineConfig
from hpg7.core.audit import AuditLog
from hpg7.core.branch_store import CopyOnWriteBranchStore
from hpg7.core.scheduler import Phase, SimulationScheduler
from hpg7.core.state import BlackHoleState, ParticleState
from hpg7.physics.advanced.gut import GUTRegimeModel
from hpg7.physics.advanced.hawking import HawkingRadiationModel
from hpg7.physics.advanced.kk_extra_dims import KaluzaKleinModule
from hpg7.physics.gameplay.collision import StructuralBody, StructuralCollisionEngine
from hpg7.physics.gameplay.motion import KinematicsEngine
from hpg7.physics.gameplay.orbital import OrbitalMechanicsEngine
from hpg7.physics.gameplay.resources import ResourceNetworkState, ResourceProductionEngine
from hpg7.physics.gameplay.thermal import ThermalLoopState, ThermalManagementEngine
from hpg7.quantum_vm.simulator import VirtualQuantumSimulator


class HPG7Engine:
    def __init__(self, config: EngineConfig | None = None) -> None:
        self.config = config or EngineConfig()
        self.audit = AuditLog()
        self.scheduler = SimulationScheduler()
        self.store = CopyOnWriteBranchStore()
        self.command_center = CommandCenterBridge()
        self.unreal_bridge = UnrealMaterialBridge()
        self.unity_bridge = UnityMaterialBridge()
        self.kinematics_engine = KinematicsEngine()
        self.collision_engine = StructuralCollisionEngine()
        self.thermal_engine = ThermalManagementEngine()
        self.resource_engine = ResourceProductionEngine()
        self.orbital_engine = OrbitalMechanicsEngine()
        self.kk_module = KaluzaKleinModule()
        self.hawking_model = HawkingRadiationModel()
        self.gut_model = GUTRegimeModel()
        self.quantum_vm = VirtualQuantumSimulator(seed=self.config.seed)

    def _build_consistency_signal(
        self,
        *,
        branch_probability: float,
        hawking_result: dict[str, object] | None,
        quantum_result: dict[str, object] | None,
    ) -> dict[str, object]:
        threshold = self.config.consistency_threshold
        band = self.config.consistency_band
        lower_bound = max(threshold - band, 0.0)
        upper_bound = min(threshold + band, 1.0)

        # A direct 0.51 cutoff on raw branch probability would reject the first 0.5 fork.
        # Normalize branching into a soft stability signal instead of a hard gate.
        branch_signal = max(0.0, min(branch_probability / 0.5, 1.0))

        quantum_peak = 0.0
        if quantum_result is not None:
            basis_probabilities = quantum_result.get("basis_probabilities", {})
            if isinstance(basis_probabilities, dict) and basis_probabilities:
                quantum_peak = max(float(probability) for probability in basis_probabilities.values())

        information_ratio = 0.0
        if hawking_result is not None:
            updated_entropy = max(float(hawking_result.get("updated_entropy", 0.0)), 1e-9)
            information_retained = max(float(hawking_result.get("information_retained", 0.0)), 0.0)
            information_ratio = min(information_retained / updated_entropy, 1.0)

        score = round(
            0.20 * branch_signal
            + 0.30 * quantum_peak
            + 0.50 * information_ratio,
            6,
        )

        if lower_bound <= score <= upper_bound:
            status = "phase_locked"
        elif score > upper_bound:
            status = "resonant"
        else:
            status = "drifting"

        return {
            "target": threshold,
            "band": band,
            "lower_bound": round(lower_bound, 6),
            "upper_bound": round(upper_bound, 6),
            "score": score,
            "status": status,
            "mode": "soft_gate",
            "components": {
                "branch_signal": round(branch_signal, 6),
                "quantum_peak": round(quantum_peak, 6),
                "information_ratio": round(information_ratio, 6),
            },
        }

    def _apply_consistency_policy(
        self,
        *,
        branch_id: str,
        consistency_signal: dict[str, object],
        event_label: str,
        event_payload: dict[str, object] | None,
    ) -> tuple[dict[str, object], str, dict[str, object]]:
        score = float(consistency_signal["score"])
        lower_bound = float(consistency_signal["lower_bound"])
        prune_floor = max(lower_bound - self.config.consistency_prune_margin, 0.0)
        event_gate = "open" if score >= lower_bound else "suppressed"
        pruned = False
        actions: list[str] = []

        branch_status = str(consistency_signal["status"])
        self.store.update_branch_metadata(
            branch_id,
            consistency_status=branch_status,
            consistency_score=score,
        )

        if score < lower_bound:
            actions.append("event_suppressed")

        if score < prune_floor:
            self.store.prune_branch(
                branch_id,
                reason="consistency_below_prune_floor",
                score=score,
            )
            pruned = True
            actions.append("branch_pruned")

        policy = {
            "event_gate": event_gate,
            "prune_floor": round(prune_floor, 6),
            "pruned": pruned,
            "branch_status": branch_status,
            "actions": actions,
        }

        if event_gate == "open":
            return policy, event_label, event_payload or {}

        payload = {
            "suppressed": True,
            "source_label": event_label,
            "reason": "consistency_drifting",
            "consistency": consistency_signal,
        }
        if event_payload:
            payload["deferred_payload"] = event_payload
        return policy, "consistency_gate", payload

    def bootstrap(self) -> dict[str, object]:
        particles = {
            "P-0": ParticleState(entity_id="P-0", position=(0.0, 0.0, 0.0), velocity=(0.1, 0.0, 0.0), mass=1.0),
            "P-1": ParticleState(entity_id="P-1", position=(1.0, 0.0, 0.0), velocity=(0.0, 0.1, 0.0), mass=1.2),
            "P-2": ParticleState(entity_id="P-2", position=(0.0, 1.0, 0.0), velocity=(0.0, 0.0, 0.1), mass=0.8),
        }
        root_branch = self.store.create_root_branch(particles)
        forked_branch = self.store.fork_branch(root_branch.branch_id, "bootstrap")
        self.store.update_particle(
            forked_branch.branch_id,
            ParticleState(entity_id="P-1", position=(1.0, 0.2, 0.0), velocity=(0.0, 0.2, 0.0), mass=1.2),
        )

        black_hole = BlackHoleState(
            entity_id="BH-0",
            mass=12.0,
            spin=0.3,
            charge=0.0,
            entropy=32.0,
            information_budget=18.0,
        )

        module_outputs = {}

        self.scheduler.run_phase(Phase.BOOT)
        self.audit.record("boot", {"branches": len(self.store.branches)})

        if self.config.enable_extra_dimensions:
            kk_projection = self.kk_module.project_field(curvature=0.42, electromagnetic_potential=0.15)
            module_outputs["kk_projection"] = asdict(kk_projection)
            self.audit.record("part28", module_outputs["kk_projection"])
            module_outputs["kk_mode_sweep"] = [
                asdict(item)
                for item in self.kk_module.scan_modes(
                    curvature=0.42,
                    electromagnetic_potential=0.15,
                    mode_count=self.config.kk_mode_count,
                )
            ]

        if self.config.enable_gameplay_systems:
            motion_frame = self.kinematics_engine.integrate_particle(
                particles["P-0"],
                thrust=(0.06, 0.02, 0.0),
                dt=1.5,
                drag=0.03,
            )
            module_outputs["motion"] = asdict(motion_frame)
            self.audit.record("gameplay_motion", module_outputs["motion"])

            collision_report = self.collision_engine.resolve_collision(
                StructuralBody(
                    entity_id="WarpShip-MkI",
                    mass=18.0,
                    radius=1.3,
                    position=(0.0, 0.0, 0.0),
                    velocity=(1.2, 0.0, 0.0),
                    hull_integrity=0.94,
                    hctg_density=12.0,
                    dpad_efficiency=0.18,
                    warp_shield_factor=0.22,
                ),
                StructuralBody(
                    entity_id="Relay-Tug",
                    mass=24.0,
                    radius=1.4,
                    position=(2.35, 0.0, 0.0),
                    velocity=(-0.35, 0.0, 0.0),
                    hull_integrity=0.97,
                    hctg_density=13.5,
                    dpad_efficiency=0.16,
                    warp_shield_factor=0.18,
                ),
            )
            module_outputs["collision"] = asdict(collision_report)
            self.audit.record("gameplay_collision", module_outputs["collision"])

            thermal_report = self.thermal_engine.regulate(
                ThermalLoopState(
                    core_temperature=318.0,
                    ambient_temperature=42.0,
                    heat_input=118.0,
                    hull_mass=54.0,
                    radiator_area=28.0,
                    s_ondol_efficiency=0.82,
                    cweh_recovery=0.24,
                ),
                dt=1.0,
            )
            module_outputs["thermal"] = asdict(thermal_report)
            self.audit.record("gameplay_thermal", module_outputs["thermal"])

            resource_report = self.resource_engine.run_cycle(
                ResourceNetworkState(
                    hydrogen_reserve=34.0,
                    solar_energy_reserve=180.0,
                    crystal_mass=22.0,
                    alloy_mass=16.0,
                    relay_gate_count=6,
                    solar_concentrator_count=4,
                    scoop_efficiency=1.35,
                    glg_chambers=3,
                    suo_crews=18,
                    main_gate_tier=2,
                ),
                cycles=self.config.resource_cycles,
            )
            module_outputs["resources"] = asdict(resource_report)
            self.audit.record("gameplay_resources", module_outputs["resources"])

            orbital_report = self.orbital_engine.propagate_circular_orbit(
                central_mass=5.972e24,
                orbital_radius_km=6871.0,
                dt=90.0,
                initial_angle_deg=12.0,
            )
            module_outputs["orbital"] = asdict(orbital_report)
            self.audit.record("gameplay_orbital", module_outputs["orbital"])

        if self.config.enable_hawking_radiation:
            hawking_result = self.hawking_model.evaporate_step(black_hole, ambient_entropy=2.5, dt=0.5)
            module_outputs["hawking"] = asdict(hawking_result)
            self.audit.record("part29", module_outputs["hawking"])
            module_outputs["hawking_history"] = [
                asdict(item)
                for item in self.hawking_model.simulate_history(
                    black_hole,
                    ambient_entropy=2.5,
                    dt=0.5,
                    steps=self.config.hawking_history_steps,
                )
            ]

        if self.config.enable_gut_regime:
            gut_result = self.gut_model.evaluate(energy_scale_gev=10**15)
            module_outputs["gut"] = asdict(gut_result)
            self.audit.record("part30", module_outputs["gut"])
            module_outputs["gut_scan"] = asdict(
                self.gut_model.scan_regime(sample_count=self.config.gut_scan_points)
            )

        nested_branch = forked_branch
        if self.config.enable_quantum_vm:
            quantum_result = self.quantum_vm.run_demo_circuit()
            module_outputs["quantum_vm"] = quantum_result
            self.audit.record("part33", quantum_result)
            nested_branch = self.store.fork_branch(forked_branch.branch_id, quantum_result["branch_event"])
            self.store.update_particle(
                nested_branch.branch_id,
                ParticleState(entity_id="P-2", position=(0.0, 1.4, 0.3), velocity=(0.0, 0.3, 0.2), mass=0.8),
            )

        self.scheduler.run_phase(Phase.SIMULATE)

        consistency_signal = self._build_consistency_signal(
            branch_probability=nested_branch.probability,
            hawking_result=module_outputs.get("hawking"),
            quantum_result=module_outputs.get("quantum_vm"),
        )
        event_label = "part33"
        event_payload = module_outputs.get("quantum_vm", {})
        consistency_policy = {
            "event_gate": "open",
            "prune_floor": max(
                consistency_signal["lower_bound"] - self.config.consistency_prune_margin,
                0.0,
            ),
            "pruned": False,
            "branch_status": consistency_signal["status"],
            "actions": [],
        }
        if self.config.enable_consistency_policy:
            consistency_policy, event_label, event_payload = self._apply_consistency_policy(
                branch_id=nested_branch.branch_id,
                consistency_signal=consistency_signal,
                event_label=event_label,
                event_payload=event_payload,
            )
            self.audit.record("consistency_policy", consistency_policy)

        branch_tree = self.store.build_branch_tree()
        latest_delta = self.store.branch_delta(nested_branch.branch_id)
        latest_snapshot = self.store.snapshot_branch(nested_branch.branch_id)

        metrics = {
            "active_branches": len(self.store.active_branches()),
            "root_branch": root_branch.branch_id,
            "forked_branch": forked_branch.branch_id,
            "latest_branch": nested_branch.branch_id,
            "particle_count": len(latest_snapshot),
            "audit_events": len(self.audit.events),
            "scheduler_phases": [phase.value for phase in self.scheduler.completed_phases],
            "consistency": consistency_signal,
            "consistency_policy": consistency_policy,
            "module_outputs": module_outputs,
        }

        if self.config.enable_command_center:
            self.scheduler.run_phase(Phase.STREAM)
            audit_labels = [event.label for event in self.audit.events]
            snapshot_payload = self.command_center.build_snapshot(
                step=0,
                metrics=metrics,
                branch_tree=branch_tree,
                audit_labels=audit_labels,
            )
            delta_payload = self.command_center.build_delta(
                step=1,
                metrics={
                    "active_branches": metrics["active_branches"],
                    "latest_branch": nested_branch.branch_id,
                    "consistency": consistency_signal,
                    "consistency_policy": consistency_policy,
                },
                branch_delta=latest_delta,
                audit_labels=audit_labels[-2:],
            )
            event_payload = self.command_center.build_event(
                step=1,
                label=event_label,
                payload=event_payload,
            )
            metrics["command_center_snapshot"] = snapshot_payload
            metrics["command_center_delta"] = delta_payload
            metrics["command_center_event"] = event_payload
            metrics["branch_tree"] = [asdict(node) for node in branch_tree]

        if self.config.enable_engine_bridges:
            metrics["unreal_payload"] = self.unreal_bridge.build_manifest(
                material_name="M_OmniverseCurvature",
                curvature=0.42,
                refractive_index=1.03,
                entropy=black_hole.entropy,
            )
            metrics["unity_payload"] = self.unity_bridge.build_manifest(
                shader_name="Shader Graph/OmniverseBranch",
                curvature=0.42,
                branch_probability=nested_branch.probability,
                entropy=black_hole.entropy,
            )

        self.scheduler.run_phase(Phase.FINALIZE)
        metrics["scheduler_phases"] = [phase.value for phase in self.scheduler.completed_phases]
        return metrics


def bootstrap_demo() -> dict[str, object]:
    engine = HPG7Engine()
    return engine.bootstrap()
