from __future__ import annotations

from math import cos, log2, pi, sin, sqrt
import random

from hpg7.quantum_vm.circuit_ir import QuantumCircuit


class VirtualQuantumSimulator:
    def __init__(self, seed: int = 7) -> None:
        self._rng = random.Random(seed)

    def _bit_for_qubit(self, qubit_count: int, target: int) -> int:
        return 1 << (qubit_count - 1 - target)

    def _apply_single_qubit_unitary(
        self,
        amplitudes: list[complex],
        qubit_count: int,
        target: int,
        matrix: tuple[tuple[complex, complex], tuple[complex, complex]],
    ) -> list[complex]:
        result = list(amplitudes)
        bit = self._bit_for_qubit(qubit_count, target)
        for index in range(len(amplitudes)):
            if index & bit:
                continue
            a0 = amplitudes[index]
            a1 = amplitudes[index | bit]
            result[index] = matrix[0][0] * a0 + matrix[0][1] * a1
            result[index | bit] = matrix[1][0] * a0 + matrix[1][1] * a1
        return result

    def _apply_controlled_x(
        self,
        amplitudes: list[complex],
        qubit_count: int,
        control: int,
        target: int,
    ) -> list[complex]:
        result = [0j] * len(amplitudes)
        control_bit = self._bit_for_qubit(qubit_count, control)
        target_bit = self._bit_for_qubit(qubit_count, target)
        for index, amplitude in enumerate(amplitudes):
            destination = index
            if index & control_bit:
                destination ^= target_bit
            result[destination] += amplitude
        return result

    def _apply_controlled_z(
        self,
        amplitudes: list[complex],
        qubit_count: int,
        control: int,
        target: int,
    ) -> list[complex]:
        result = list(amplitudes)
        control_bit = self._bit_for_qubit(qubit_count, control)
        target_bit = self._bit_for_qubit(qubit_count, target)
        for index, amplitude in enumerate(amplitudes):
            if index & control_bit and index & target_bit:
                result[index] = -amplitude
        return result

    def _basis_label(self, index: int, qubit_count: int) -> str:
        return format(index, f"0{qubit_count}b")

    def _state_norm(self, amplitudes: list[complex]) -> float:
        return sum(amplitude.real * amplitude.real + amplitude.imag * amplitude.imag for amplitude in amplitudes)

    def _normalize(self, amplitudes: list[complex]) -> list[complex]:
        norm = max(self._state_norm(amplitudes), 1e-12)
        scale = 1.0 / sqrt(norm)
        return [amplitude * scale for amplitude in amplitudes]

    def _serialize_amplitudes(self, amplitudes: list[complex], qubit_count: int) -> dict[str, dict[str, float]]:
        payload: dict[str, dict[str, float]] = {}
        for index, amplitude in enumerate(amplitudes):
            if abs(amplitude) < 1e-12:
                continue
            payload[self._basis_label(index, qubit_count)] = {
                "real": round(amplitude.real, 6),
                "imag": round(amplitude.imag, 6),
            }
        return payload

    def _probabilities(self, amplitudes: list[complex], qubit_count: int) -> dict[str, float]:
        payload: dict[str, float] = {}
        for index, amplitude in enumerate(amplitudes):
            probability = amplitude.real * amplitude.real + amplitude.imag * amplitude.imag
            if probability < 1e-12:
                continue
            payload[self._basis_label(index, qubit_count)] = round(probability, 6)
        return payload

    def _sample_measurement(self, amplitudes: list[complex], qubit_count: int) -> tuple[int, ...]:
        roll = self._rng.random()
        cumulative = 0.0
        for index, amplitude in enumerate(amplitudes):
            cumulative += amplitude.real * amplitude.real + amplitude.imag * amplitude.imag
            if roll <= cumulative + 1e-12:
                label = self._basis_label(index, qubit_count)
                return tuple(int(bit) for bit in label)
        label = self._basis_label(len(amplitudes) - 1, qubit_count)
        return tuple(int(bit) for bit in label)

    def _shot_histogram(
        self,
        amplitudes: list[complex],
        qubit_count: int,
        *,
        shots: int,
    ) -> dict[str, int]:
        histogram: dict[str, int] = {}
        for _ in range(max(shots, 1)):
            measurement = self._sample_measurement(amplitudes, qubit_count)
            label = "".join(str(bit) for bit in measurement)
            histogram[label] = histogram.get(label, 0) + 1
        return dict(sorted(histogram.items()))

    def _measurement_entropy(self, probabilities: dict[str, float]) -> float:
        entropy = 0.0
        for probability in probabilities.values():
            if probability <= 0.0:
                continue
            entropy -= probability * log2(probability)
        return round(entropy, 6)

    def _single_qubit_reduced_density(
        self,
        amplitudes: list[complex],
        qubit_count: int,
        target: int,
    ) -> tuple[tuple[complex, complex], tuple[complex, complex]]:
        bit = self._bit_for_qubit(qubit_count, target)
        rho00 = 0j
        rho11 = 0j
        rho01 = 0j
        for index in range(len(amplitudes)):
            if index & bit:
                continue
            a0 = amplitudes[index]
            a1 = amplitudes[index | bit]
            rho00 += a0 * a0.conjugate()
            rho11 += a1 * a1.conjugate()
            rho01 += a0 * a1.conjugate()
        return ((rho00, rho01), (rho01.conjugate(), rho11))

    def _qubit_observables(
        self,
        amplitudes: list[complex],
        qubit_count: int,
    ) -> tuple[list[float], list[float], list[float]]:
        entropies: list[float] = []
        purities: list[float] = []
        expectation_z: list[float] = []
        for target in range(qubit_count):
            density = self._single_qubit_reduced_density(amplitudes, qubit_count, target)
            rho00 = max(density[0][0].real, 0.0)
            rho11 = max(density[1][1].real, 0.0)
            coherence = abs(density[0][1])
            trace = rho00 + rho11
            det = max((rho00 * rho11) - coherence * coherence, 0.0)
            discriminant = max(trace * trace - 4.0 * det, 0.0)
            root = sqrt(discriminant)
            eigenvalues = (
                clamp_scalar((trace + root) * 0.5, 0.0, 1.0),
                clamp_scalar((trace - root) * 0.5, 0.0, 1.0),
            )
            entropy = 0.0
            for eigenvalue in eigenvalues:
                if eigenvalue > 1e-12:
                    entropy -= eigenvalue * log2(eigenvalue)
            purity = clamp_scalar((rho00 * rho00) + (rho11 * rho11) + (2.0 * coherence * coherence), 0.0, 1.0)
            entropies.append(round(entropy, 6))
            purities.append(round(purity, 6))
            expectation_z.append(round(rho00 - rho11, 6))
        return entropies, purities, expectation_z

    def _gate_matrix(self, name: str, parameter: float | None) -> tuple[tuple[complex, complex], tuple[complex, complex]]:
        angle = parameter or 0.0
        if name == "X":
            return ((0j, 1.0 + 0.0j), (1.0 + 0.0j, 0j))
        if name == "Y":
            return ((0j, -1j), (1j, 0j))
        if name == "Z":
            return ((1.0 + 0.0j, 0j), (0j, -1.0 + 0.0j))
        if name == "H":
            scale = 1.0 / sqrt(2.0)
            return ((scale, scale), (scale, -scale))
        if name == "S":
            return ((1.0 + 0.0j, 0j), (0j, 1j))
        if name == "T":
            phase = complex(cos(pi / 4.0), sin(pi / 4.0))
            return ((1.0 + 0.0j, 0j), (0j, phase))
        if name == "RX":
            c = cos(angle * 0.5)
            s = sin(angle * 0.5)
            return ((c, -1j * s), (-1j * s, c))
        if name == "RY":
            c = cos(angle * 0.5)
            s = sin(angle * 0.5)
            return ((c, -s), (s, c))
        if name == "RZ":
            minus = complex(cos(-angle * 0.5), sin(-angle * 0.5))
            plus = complex(cos(angle * 0.5), sin(angle * 0.5))
            return ((minus, 0j), (0j, plus))
        raise ValueError(f"Unsupported single-qubit gate: {name}")

    def run_circuit(self, circuit: QuantumCircuit, *, shots: int | None = None) -> dict[str, object]:
        statevector = [0j] * (2 ** circuit.qubit_count)
        statevector[0] = 1.0 + 0.0j

        for gate in circuit.gates:
            if gate.name in {"H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ"}:
                matrix = self._gate_matrix(gate.name, gate.parameter)
                statevector = self._apply_single_qubit_unitary(statevector, circuit.qubit_count, gate.targets[0], matrix)
            elif gate.name == "CNOT":
                if not gate.controls:
                    raise ValueError("CNOT gate requires one control qubit")
                statevector = self._apply_controlled_x(statevector, circuit.qubit_count, gate.controls[0], gate.targets[0])
            elif gate.name == "CZ":
                if not gate.controls:
                    raise ValueError("CZ gate requires one control qubit")
                statevector = self._apply_controlled_z(statevector, circuit.qubit_count, gate.controls[0], gate.targets[0])
            else:
                raise ValueError(f"Unsupported gate: {gate.name}")
            statevector = self._normalize(statevector)

        probabilities = self._probabilities(statevector, circuit.qubit_count)
        amplitudes = self._serialize_amplitudes(statevector, circuit.qubit_count)
        dominant_outcome = max(probabilities.items(), key=lambda item: (item[1], item[0]))[0]
        measurement = self._sample_measurement(statevector, circuit.qubit_count)
        shot_count = shots if shots is not None else circuit.shots
        entropies, purities, expectation_z = self._qubit_observables(statevector, circuit.qubit_count)
        return {
            "qubit_count": circuit.qubit_count,
            "gate_count": len(circuit.gates),
            "statevector": amplitudes,
            "basis_probabilities": probabilities,
            "shot_histogram": self._shot_histogram(statevector, circuit.qubit_count, shots=shot_count),
            "shot_count": shot_count,
            "measurement": list(measurement),
            "dominant_outcome": dominant_outcome,
            "state_norm": round(self._state_norm(statevector), 6),
            "measurement_entropy": self._measurement_entropy(probabilities),
            "single_qubit_entropies": entropies,
            "single_qubit_purities": purities,
            "expectation_z": expectation_z,
            "branch_event": "entangled_measurement",
        }

    def run_demo_circuit(self) -> dict[str, object]:
        circuit = QuantumCircuit(qubit_count=2, shots=512)
        circuit.add_gate("H", 0)
        circuit.add_gate("CNOT", 1, controls=(0,))
        return self.run_circuit(circuit)


def clamp_scalar(value: float, min_value: float, max_value: float) -> float:
    return min(max(value, min_value), max_value)
