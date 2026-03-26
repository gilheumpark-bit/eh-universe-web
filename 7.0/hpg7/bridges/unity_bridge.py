from __future__ import annotations

import json


class UnityMaterialBridge:
    def build_payload(self, curvature: float, branch_probability: float, entropy: float) -> dict[str, float]:
        return {
            "_Curvature": curvature,
            "_BranchProbability": branch_probability,
            "_Entropy": entropy,
        }

    def build_manifest(
        self,
        *,
        shader_name: str,
        curvature: float,
        branch_probability: float,
        entropy: float,
    ) -> dict[str, object]:
        return {
            "engine": "unity",
            "shader_name": shader_name,
            "parameter_namespace": "shader",
            "parameters": self.build_payload(curvature, branch_probability, entropy),
        }

    def export_json(
        self,
        *,
        shader_name: str,
        curvature: float,
        branch_probability: float,
        entropy: float,
    ) -> str:
        manifest = self.build_manifest(
            shader_name=shader_name,
            curvature=curvature,
            branch_probability=branch_probability,
            entropy=entropy,
        )
        return json.dumps(manifest, indent=2, sort_keys=True)
