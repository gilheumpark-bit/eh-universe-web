import json
import unittest

from hpg7.app import HPG7Engine, bootstrap_demo
from hpg7.config import EngineConfig
from hpg7.core.state import BlackHoleState
from hpg7.dashboard.server import build_dashboard_payload, load_dashboard_html
from hpg7.core.branch_store import CopyOnWriteBranchStore
from hpg7.core.state import ParticleState
from hpg7.physics.advanced.gut import GUTRegimeModel
from hpg7.physics.advanced.hawking import HawkingRadiationModel
from hpg7.physics.advanced.kk_extra_dims import KaluzaKleinModule
from hpg7.physics.gameplay.collision import StructuralBody, StructuralCollisionEngine
from hpg7.physics.gameplay.motion import KinematicsEngine
from hpg7.physics.gameplay.orbital import OrbitalMechanicsEngine
from hpg7.physics.gameplay.resources import ResourceNetworkState, ResourceProductionEngine
from hpg7.physics.gameplay.thermal import ThermalLoopState, ThermalManagementEngine
from hpg7.quantum_vm.circuit_ir import QuantumCircuit
from hpg7.quantum_vm.simulator import VirtualQuantumSimulator


class BootstrapTest(unittest.TestCase):
    def test_bootstrap_demo_returns_expected_keys(self) -> None:
        summary = bootstrap_demo()
        self.assertIn("active_branches", summary)
        self.assertIn("module_outputs", summary)
        self.assertIn("consistency", summary)
        self.assertIn("consistency_policy", summary)
        self.assertIn("command_center_snapshot", summary)
        self.assertIn("branch_tree", summary)
        payload = json.loads(summary["command_center_snapshot"])
        self.assertEqual(payload["packet_type"], "snapshot")
        self.assertEqual(payload["branch_tree"][0]["branch_id"], "BRANCH-0")
        self.assertGreaterEqual(summary["active_branches"], 3)
        self.assertEqual(summary["consistency"]["target"], 0.51)
        self.assertIn(summary["consistency"]["status"], {"phase_locked", "resonant", "drifting"})
        self.assertEqual(summary["consistency_policy"]["event_gate"], "open")
        self.assertFalse(summary["consistency_policy"]["pruned"])
        self.assertIn("kk_mode_sweep", summary["module_outputs"])
        self.assertIn("hawking_history", summary["module_outputs"])
        self.assertIn("gut_scan", summary["module_outputs"])
        self.assertIn("motion", summary["module_outputs"])
        self.assertIn("collision", summary["module_outputs"])
        self.assertIn("thermal", summary["module_outputs"])
        self.assertIn("resources", summary["module_outputs"])
        self.assertIn("orbital", summary["module_outputs"])

    def test_branch_store_builds_tree_and_delta(self) -> None:
        store = CopyOnWriteBranchStore()
        root = store.create_root_branch(
            {
                "P-0": ParticleState(entity_id="P-0", position=(0.0, 0.0, 0.0), velocity=(0.0, 0.0, 0.0), mass=1.0),
            }
        )
        child = store.fork_branch(root.branch_id, "test")
        store.update_particle(
            child.branch_id,
            ParticleState(entity_id="P-0", position=(1.0, 0.0, 0.0), velocity=(0.0, 0.0, 0.0), mass=1.0),
        )
        tree = store.build_branch_tree()
        delta = store.branch_delta(child.branch_id)
        self.assertEqual(len(tree), 2)
        self.assertEqual(delta.parent_id, root.branch_id)
        self.assertEqual(delta.changed_entities, ("P-0",))

        store.prune_branch(child.branch_id, reason="test", score=0.4)
        self.assertEqual(store.get_branch(child.branch_id).probability, 0.0)
        self.assertTrue(store.get_branch(child.branch_id).metadata["pruned"])

    def test_quantum_vm_generates_bell_state(self) -> None:
        simulator = VirtualQuantumSimulator(seed=7)
        circuit = QuantumCircuit(qubit_count=2)
        circuit.add_gate("H", 0)
        circuit.add_gate("CNOT", 1, controls=(0,))
        result = simulator.run_circuit(circuit)
        self.assertEqual(result["basis_probabilities"]["00"], 0.5)
        self.assertEqual(result["basis_probabilities"]["11"], 0.5)
        self.assertIn(tuple(result["measurement"]), {(0, 0), (1, 1)})
        self.assertEqual(result["state_norm"], 1.0)
        self.assertEqual(result["measurement_entropy"], 1.0)
        self.assertEqual(result["single_qubit_entropies"], [1.0, 1.0])
        self.assertEqual(sum(result["shot_histogram"].values()), result["shot_count"])

    def test_advanced_physics_reports(self) -> None:
        kk = KaluzaKleinModule()
        kk_modes = kk.scan_modes(0.42, 0.15, mode_count=4)
        self.assertEqual(len(kk_modes), 4)
        self.assertGreater(kk_modes[-1].mode_mass, kk_modes[0].mode_mass)
        self.assertLess(kk_modes[-1].gauge_mixing, kk_modes[0].gauge_mixing)

        hawking = HawkingRadiationModel()
        history = hawking.simulate_history(
            black_hole=BlackHoleState(
                entity_id="BH-0",
                mass=12.0,
                spin=0.3,
                charge=0.0,
                entropy=32.0,
                information_budget=18.0,
            ),
            ambient_entropy=2.5,
            dt=0.5,
            steps=4,
        )
        self.assertGreaterEqual(len(history), 1)
        self.assertLess(history[-1].mass, history[0].mass)
        self.assertGreater(history[0].temperature, 0.0)
        self.assertGreaterEqual(history[-1].page_fraction, history[0].page_fraction)

        gut = GUTRegimeModel()
        scan = gut.scan_regime(sample_count=5)
        self.assertEqual(len(scan.points), 5)
        low_energy = gut.evaluate(energy_scale_gev=10**3)
        high_energy = gut.evaluate(energy_scale_gev=10**16)
        self.assertLess(high_energy.unified_gap, low_energy.unified_gap)
        self.assertGreaterEqual(scan.best_unification_scale, 10**12)

    def test_gameplay_system_reports(self) -> None:
        motion = KinematicsEngine().integrate_particle(
            ParticleState(
                entity_id="P-0",
                position=(0.0, 0.0, 0.0),
                velocity=(0.1, 0.0, 0.0),
                mass=1.0,
            ),
            thrust=(0.04, 0.02, 0.0),
            dt=2.0,
            drag=0.02,
        )
        self.assertGreater(motion.updated_position[0], motion.start_position[0])
        self.assertGreater(motion.kinetic_energy, 0.0)

        collision = StructuralCollisionEngine().resolve_collision(
            StructuralBody(
                entity_id="A",
                mass=16.0,
                radius=1.2,
                position=(0.0, 0.0, 0.0),
                velocity=(1.0, 0.0, 0.0),
                hull_integrity=0.95,
                hctg_density=11.0,
                dpad_efficiency=0.12,
                warp_shield_factor=0.18,
            ),
            StructuralBody(
                entity_id="B",
                mass=21.0,
                radius=1.3,
                position=(2.1, 0.0, 0.0),
                velocity=(-0.4, 0.0, 0.0),
                hull_integrity=0.93,
                hctg_density=12.0,
                dpad_efficiency=0.1,
                warp_shield_factor=0.16,
            ),
        )
        self.assertTrue(collision.collided)
        self.assertLess(collision.updated_hull_a, 0.95)
        self.assertIn(collision.verdict, {"allow", "hold", "deny"})

        thermal = ThermalManagementEngine().regulate(
            ThermalLoopState(
                core_temperature=325.0,
                ambient_temperature=40.0,
                heat_input=120.0,
                hull_mass=52.0,
                radiator_area=26.0,
                s_ondol_efficiency=0.8,
                cweh_recovery=0.2,
            ),
            dt=1.0,
        )
        self.assertGreater(thermal.updated_temperature, 0.0)
        self.assertIn(thermal.status, {"stable", "warning", "critical"})

        resources = ResourceProductionEngine().run_cycle(
            ResourceNetworkState(
                hydrogen_reserve=30.0,
                solar_energy_reserve=150.0,
                crystal_mass=18.0,
                alloy_mass=14.0,
                relay_gate_count=5,
                solar_concentrator_count=3,
                scoop_efficiency=1.2,
                glg_chambers=2,
                suo_crews=16,
                main_gate_tier=2,
            ),
            cycles=3,
        )
        self.assertGreater(resources.updated_hydrogen_reserve, 30.0)
        self.assertGreater(resources.lattice_density, 7.0)

        orbital = OrbitalMechanicsEngine().propagate_circular_orbit(
            central_mass=5.972e24,
            orbital_radius_km=6871.0,
            dt=120.0,
            initial_angle_deg=0.0,
        )
        self.assertGreater(orbital.orbital_speed_km_s, 0.0)
        self.assertGreater(orbital.updated_angle_deg, 0.0)
        self.assertEqual(orbital.status, "bound")

    def test_dashboard_payload_and_html(self) -> None:
        html = load_dashboard_html()
        self.assertIn("Command Center Bridge", html)
        payload = build_dashboard_payload()
        self.assertIn("command_center_snapshot", payload)
        self.assertEqual(payload["command_center_snapshot"]["packet_type"], "snapshot")

    def test_consistency_policy_can_suppress_and_prune(self) -> None:
        engine = HPG7Engine(
            EngineConfig(
                consistency_threshold=0.8,
                consistency_band=0.005,
                consistency_prune_margin=0.05,
            )
        )
        summary = engine.bootstrap()
        event_packet = json.loads(summary["command_center_event"])
        self.assertEqual(summary["consistency_policy"]["event_gate"], "suppressed")
        self.assertTrue(summary["consistency_policy"]["pruned"])
        self.assertEqual(summary["active_branches"], 2)
        self.assertEqual(event_packet["metrics"]["label"], "consistency_gate")


if __name__ == "__main__":
    unittest.main()
