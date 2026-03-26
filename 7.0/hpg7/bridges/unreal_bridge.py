from __future__ import annotations

import json


class UnrealMaterialBridge:
    def build_payload(self, curvature: float, refractive_index: float, entropy: float) -> dict[str, float]:
        return {
            "material.curvature_scalar": curvature,
            "material.refraction_index": refractive_index,
            "material.entropy_heat": entropy,
        }

    def build_manifest(
        self,
        *,
        material_name: str,
        curvature: float,
        refractive_index: float,
        entropy: float,
    ) -> dict[str, object]:
        return {
            "engine": "unreal-engine-5",
            "material_name": material_name,
            "parameter_namespace": "material",
            "parameters": self.build_payload(curvature, refractive_index, entropy),
        }

    def export_json(
        self,
        *,
        material_name: str,
        curvature: float,
        refractive_index: float,
        entropy: float,
    ) -> str:
        manifest = self.build_manifest(
            material_name=material_name,
            curvature=curvature,
            refractive_index=refractive_index,
            entropy=entropy,
        )
        return json.dumps(manifest, indent=2, sort_keys=True)
