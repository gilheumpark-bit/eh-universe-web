from __future__ import annotations

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import urlparse

from hpg7.app import bootstrap_demo
from hpg7.noa_tower import NoaTowerEngine

ASSET_DIR = Path(__file__).resolve().parent / "assets"
NOA_TOWER_ENGINE = NoaTowerEngine()


def load_dashboard_html() -> str:
    return (ASSET_DIR / "index.html").read_text(encoding="utf-8")


def load_noa_tower_html() -> str:
    return (ASSET_DIR / "noa_tower.html").read_text(encoding="utf-8")


def build_dashboard_payload() -> dict[str, object]:
    summary = bootstrap_demo()
    payload = dict(summary)
    for key in ("command_center_snapshot", "command_center_delta", "command_center_event"):
        if key in payload:
            payload[key] = json.loads(payload[key])
    return payload


def build_noa_tower_payload() -> dict[str, object]:
    return NOA_TOWER_ENGINE.bootstrap()


class DashboardRequestHandler(BaseHTTPRequestHandler):
    server_version = "HPG7Dashboard/1.0"

    def log_message(self, format: str, *args: object) -> None:
        return

    def _write(self, status: HTTPStatus, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict[str, object]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw_body = self.rfile.read(length)
        if not raw_body:
            return {}
        return json.loads(raw_body.decode("utf-8"))

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            body = load_dashboard_html().encode("utf-8")
            self._write(HTTPStatus.OK, body, "text/html; charset=utf-8")
            return
        if path in ("/noa-tower", "/noa-tower.html"):
            body = load_noa_tower_html().encode("utf-8")
            self._write(HTTPStatus.OK, body, "text/html; charset=utf-8")
            return
        if path == "/api/bootstrap":
            body = json.dumps(build_dashboard_payload(), sort_keys=True, default=str).encode("utf-8")
            self._write(HTTPStatus.OK, body, "application/json; charset=utf-8")
            return
        if path == "/api/noa-tower/bootstrap":
            body = json.dumps(build_noa_tower_payload(), sort_keys=True, default=str).encode("utf-8")
            self._write(HTTPStatus.OK, body, "application/json; charset=utf-8")
            return
        self._write(HTTPStatus.NOT_FOUND, b"not found", "text/plain; charset=utf-8")

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path != "/api/noa-tower/respond":
            self._write(HTTPStatus.NOT_FOUND, b"not found", "text/plain; charset=utf-8")
            return
        try:
            payload = self._read_json_body()
            response_payload = NOA_TOWER_ENGINE.respond(
                message=str(payload.get("message", "")),
                state=payload.get("state") if isinstance(payload.get("state"), dict) else None,
                action=str(payload.get("action", "submit")),
            )
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            body = json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8")
            self._write(HTTPStatus.BAD_REQUEST, body, "application/json; charset=utf-8")
            return
        body = json.dumps(response_payload, ensure_ascii=False, default=str).encode("utf-8")
        self._write(HTTPStatus.OK, body, "application/json; charset=utf-8")


def serve_dashboard(host: str = "127.0.0.1", port: int = 8765) -> None:
    server = ThreadingHTTPServer((host, port), DashboardRequestHandler)
    print(f"HPG 7.0 dashboard listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
