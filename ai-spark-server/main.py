# ============================================================
# EH Universe — DGX Spark AI Server
# LM Studio 프록시 + 회원당 일 100회 제한 + 보안
# ============================================================

import os
import time
import logging
from collections import defaultdict
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

logger = logging.getLogger("dgx-server")
logging.basicConfig(level=logging.INFO)

# ============================================================
# PART 1 — 설정
# ============================================================

# LM Studio 로컬 서버 URL
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234")

# 허용 도메인 (운영)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://ehsu.app,http://localhost:3000").split(",")

# 일일 호출 제한
DAILY_LIMIT = int(os.getenv("DAILY_LIMIT", "100"))

# API 키 (선택 — 설정 시 인증 필수)
API_KEY = os.getenv("DGX_API_KEY", "")

app = FastAPI(title="EH Universe DGX Spark Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ============================================================
# PART 2 — 회원당 일 100회 호출 제한
# ============================================================

# { "user_id": { "date": "2026-04-11", "count": 42 } }
rate_limits: dict[str, dict] = defaultdict(lambda: {"date": "", "count": 0})

def get_user_id(request: Request) -> str:
    """요청에서 사용자 ID 추출 (헤더 또는 IP 폴백)"""
    uid = request.headers.get("x-user-id") or request.headers.get("x-forwarded-for") or request.client.host
    return uid.strip()

def check_rate_limit(user_id: str):
    """일일 100회 제한 확인"""
    today = time.strftime("%Y-%m-%d")
    entry = rate_limits[user_id]

    if entry["date"] != today:
        entry["date"] = today
        entry["count"] = 0

    if entry["count"] >= DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"일일 호출 한도 {DAILY_LIMIT}회 초과. 내일 초기화됩니다.",
            headers={"Retry-After": "86400"},
        )

    entry["count"] += 1
    return entry["count"]

def verify_api_key(request: Request):
    """API 키 인증 (DGX_API_KEY 설정 시 활성)"""
    if not API_KEY:
        return
    auth = request.headers.get("authorization", "")
    if auth != f"Bearer {API_KEY}" and request.headers.get("x-api-key") != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

# ============================================================
# PART 3 — LM Studio 프록시 (OpenAI 호환)
# ============================================================

class ChatRequest(BaseModel):
    model: str = "gemma-4-26b-it"
    messages: list[dict]
    temperature: float = 0.7
    max_tokens: int | None = None
    stream: bool = False

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "server": "EH Universe DGX Spark",
        "lm_studio": LM_STUDIO_URL,
        "daily_limit": DAILY_LIMIT,
    }

@app.get("/v1/models")
async def list_models():
    """LM Studio 모델 목록 프록시"""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(f"{LM_STUDIO_URL}/v1/models")
            return resp.json()
        except httpx.ConnectError:
            return {"data": [{"id": "local-model", "object": "model"}]}

@app.post("/v1/chat/completions")
async def chat_completions(req: ChatRequest, request: Request):
    """OpenAI 호환 챗봇 — LM Studio로 프록시"""
    verify_api_key(request)
    user_id = get_user_id(request)
    count = check_rate_limit(user_id)

    logger.info(f"[{user_id}] 호출 {count}/{DAILY_LIMIT} — model={req.model}")

    payload = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature,
        "stream": req.stream,
    }
    if req.max_tokens:
        payload["max_tokens"] = req.max_tokens

    async with httpx.AsyncClient(timeout=180) as client:
        try:
            if req.stream:
                # SSE 스트리밍 프록시
                async def stream_generator():
                    async with client.stream(
                        "POST",
                        f"{LM_STUDIO_URL}/v1/chat/completions",
                        json=payload,
                        timeout=180,
                    ) as resp:
                        async for chunk in resp.aiter_bytes():
                            yield chunk

                return StreamingResponse(
                    stream_generator(),
                    media_type="text/event-stream",
                    headers={"X-DGX-Usage": f"{count}/{DAILY_LIMIT}"},
                )
            else:
                resp = await client.post(
                    f"{LM_STUDIO_URL}/v1/chat/completions",
                    json=payload,
                    timeout=180,
                )
                data = resp.json()
                data["usage_info"] = {"daily_count": count, "daily_limit": DAILY_LIMIT}
                return data

        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="LM Studio 서버에 연결할 수 없습니다. 서버 실행 상태를 확인하세요.")
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

# ============================================================
# PART 4 — 사용량 조회
# ============================================================

@app.get("/api/usage")
async def get_usage(request: Request):
    """현재 사용자의 일일 사용량 조회"""
    user_id = get_user_id(request)
    today = time.strftime("%Y-%m-%d")
    entry = rate_limits.get(user_id, {"date": today, "count": 0})
    if entry["date"] != today:
        return {"user_id": user_id, "date": today, "count": 0, "limit": DAILY_LIMIT, "remaining": DAILY_LIMIT}
    return {
        "user_id": user_id,
        "date": today,
        "count": entry["count"],
        "limit": DAILY_LIMIT,
        "remaining": max(0, DAILY_LIMIT - entry["count"]),
    }

# ============================================================
# PART 5 — 코드 샌드박스 (Code Studio 연동)
# ============================================================

@app.post("/api/sandbox/execute")
async def execute_code(request: Request):
    """Code Studio 코드 검증 엔드포인트"""
    verify_api_key(request)
    body = await request.json()
    source_code = body.get("code", "")

    if not source_code.strip():
        raise HTTPException(status_code=400, detail="코드가 비어 있습니다")

    # 위험 패턴 정적 검사
    dangerous = ["os.system", "subprocess", "eval(", "exec(", "__import__", "shutil.rmtree"]
    found = [d for d in dangerous if d in source_code]
    if found:
        return {
            "status": "rejected",
            "reason": f"위험 패턴 감지: {', '.join(found)}",
            "security_check": "BLOCKED",
        }

    return {
        "status": "success",
        "output": "정적 검사 통과",
        "security_check": "Safe",
    }

# ============================================================
# PART 6 — 서버 시작
# ============================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting DGX Spark Server on 0.0.0.0:{port}")
    logger.info(f"LM Studio: {LM_STUDIO_URL}")
    logger.info(f"Daily limit: {DAILY_LIMIT} calls/user")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
