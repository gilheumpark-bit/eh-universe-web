from __future__ import annotations

import argparse
import json
from pathlib import Path

from hpg7 import EngineConfig, HPG7Engine
from hpg7.dashboard import serve_dashboard
from hpg7.noa_tower import NoaTowerEngine


def run_demo() -> None:
    summary = HPG7Engine().bootstrap()
    print("HPG 7.0 bootstrap summary")
    for key in sorted(summary):
        print(f"- {key}: {summary[key]}")


def export_bridges(out_dir: Path) -> None:
    engine = HPG7Engine()
    summary = engine.bootstrap()
    out_dir.mkdir(parents=True, exist_ok=True)
    unreal_path = out_dir / "unreal_material_manifest.json"
    unity_path = out_dir / "unity_shader_manifest.json"
    unreal_path.write_text(json.dumps(summary["unreal_payload"], indent=2, sort_keys=True), encoding="utf-8")
    unity_path.write_text(json.dumps(summary["unity_payload"], indent=2, sort_keys=True), encoding="utf-8")
    print(f"exported: {unreal_path}")
    print(f"exported: {unity_path}")


def run_noa_tower_demo() -> None:
    engine = NoaTowerEngine()
    payload = engine.respond(message="반대로 보면 이 구조는 정답보다 질문을 숨기고 있습니다.", state=None)
    print("NOA TOWER demo")
    print(payload["reply"]["bucket_title"])
    print(payload["reply"]["text"])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="HPG 7.0 Omniverse Platform CLI")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("demo", help="Run the bootstrap demo")
    subparsers.add_parser("noa-tower-demo", help="Run the NOA TOWER dialogue demo")

    serve = subparsers.add_parser("serve", help="Run the dashboard server")
    serve.add_argument("--host", default=EngineConfig().dashboard_host)
    serve.add_argument("--port", type=int, default=EngineConfig().dashboard_port)

    serve_noa = subparsers.add_parser("serve-noa-tower", help="Run the web page game server")
    serve_noa.add_argument("--host", default=EngineConfig().dashboard_host)
    serve_noa.add_argument("--port", type=int, default=EngineConfig().dashboard_port)

    export = subparsers.add_parser("export-bridges", help="Export Unreal and Unity manifests")
    export.add_argument("--out-dir", default="exports")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    command = args.command or "demo"

    if command == "demo":
        run_demo()
        return
    if command == "serve":
        serve_dashboard(host=args.host, port=args.port)
        return
    if command == "serve-noa-tower":
        print(f"Open http://{args.host}:{args.port}/noa-tower")
        serve_dashboard(host=args.host, port=args.port)
        return
    if command == "export-bridges":
        export_bridges(Path(args.out_dir))
        return
    if command == "noa-tower-demo":
        run_noa_tower_demo()
        return
    parser.error(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
