# ============================================================
# EH Universe — WebSocket Streaming Router
# ============================================================
# Vercel 100초 타임아웃 우회용 양방향 스트리밍
# FastAPI WebSocket → vLLM SSE → 클라이언트 실시간 전달
# ============================================================

import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import httpx

ws_router = APIRouter()

VLLM_URL = "http://localhost:8000/v1/chat/completions"


class ConnectionManager:
    """WebSocket 연결 관리자"""

    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def send_chunk(self, text: str, ws: WebSocket) -> None:
        await ws.send_text(json.dumps({"type": "stream", "content": text}))

    async def send_done(self, ws: WebSocket) -> None:
        await ws.send_text(json.dumps({"type": "done"}))

    async def send_error(self, error: str, ws: WebSocket) -> None:
        await ws.send_text(json.dumps({"type": "error", "content": error}))


manager = ConnectionManager()


@ws_router.websocket("/ws/generate")
async def ws_generate(websocket: WebSocket) -> None:
    """
    WebSocket 스트리밍 엔드포인트.
    클라이언트가 JSON 요청을 보내면 vLLM SSE 스트림을 실시간 중계.
    """
    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_error("Invalid JSON", websocket)
                continue

            prompt = payload.get("prompt", "")
            if not prompt:
                await manager.send_error("Empty prompt", websocket)
                continue

            messages = payload.get("messages", [{"role": "user", "content": prompt}])
            model = payload.get("model", "eh-universe-30b-fast")
            temperature = payload.get("temperature", 0.7)
            max_tokens = min(payload.get("max_tokens", 8192), 12000)

            # vLLM SSE 스트림 중계
            vllm_payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            }

            try:
                async with httpx.AsyncClient(timeout=300) as client:
                    async with client.stream(
                        "POST", VLLM_URL, json=vllm_payload
                    ) as resp:
                        async for line in resp.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    await manager.send_chunk(content, websocket)
                            except json.JSONDecodeError:
                                continue

                await manager.send_done(websocket)

            except httpx.ConnectError:
                await manager.send_error("vLLM 서버 연결 실패", websocket)
            except asyncio.CancelledError:
                break
            except Exception as e:
                await manager.send_error(str(e), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
