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

# ============================================================
# PART 1.5 — 동시 사용자 제한 (세마포어)
# ============================================================

import asyncio

MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "4"))
_semaphore = asyncio.Semaphore(MAX_CONCURRENT)
_waiting = 0  # 대기 중인 요청 수

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

GUEST_LIMIT = int(os.getenv("GUEST_LIMIT", "20"))

def check_rate_limit(user_id: str, user_tier: str = "free"):
    """티어별 일일 제한: 비로그인 20회, 로그인 100회, BYOK 무제한"""
    limit = GUEST_LIMIT if user_tier == "none" else DAILY_LIMIT
    today = time.strftime("%Y-%m-%d")
    entry = rate_limits[user_id]

    if entry["date"] != today:
        entry["date"] = today
        entry["count"] = 0

    if entry["count"] >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"일일 호출 한도 {limit}회 초과. {'로그인하면 {DAILY_LIMIT}회로 늘어납니다.' if user_tier == 'none' else '내일 초기화됩니다.'}",
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

MIN_OUTPUT_CHARS = int(os.getenv("MIN_OUTPUT_CHARS", "5500"))
MAX_OUTPUT_CHARS = int(os.getenv("MAX_OUTPUT_CHARS", "8000"))
# max_tokens 추정: 한글 1자 ≈ 1.5토큰, 8000자 ≈ 12000토큰
MAX_OUTPUT_TOKENS = int(MAX_OUTPUT_CHARS * 1.5)

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
        "guest_limit": GUEST_LIMIT,
        "max_concurrent": MAX_CONCURRENT,
        "current_waiting": _waiting,
        "output_chars": {"min": MIN_OUTPUT_CHARS, "max": MAX_OUTPUT_CHARS},
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
    """OpenAI 호환 챗봇 — LM Studio로 프록시 (동시 4명 제한)"""
    global _waiting

    verify_api_key(request)
    user_id = get_user_id(request)
    user_tier = request.headers.get("x-user-tier", "none")
    count = check_rate_limit(user_id, user_tier)

    # 동시 사용자 제한: 5명부터 대기 메시지
    if _semaphore.locked():
        _waiting += 1
        queue_pos = _waiting
        if queue_pos > 10:
            _waiting -= 1
            raise HTTPException(
                status_code=503,
                detail=f"현재 서버가 매우 혼잡합니다. 잠시 후 다시 시도해주세요. (대기열: {queue_pos}명)",
            )
        logger.info(f"[{user_id}] 대기열 {queue_pos}번째 — 현재 {MAX_CONCURRENT}명 처리 중")

    try:
        async with _semaphore:
            if _waiting > 0:
                _waiting -= 1

            logger.info(f"[{user_id}] 호출 {count}/{DAILY_LIMIT} — model={req.model}")

            # max_tokens 강제: 8000자 ≈ 12000토큰 상한
            effective_max_tokens = min(req.max_tokens or MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS)

            payload = {
                "model": req.model,
                "messages": req.messages,
                "temperature": req.temperature,
                "stream": req.stream,
                "max_tokens": effective_max_tokens,
            }

            async with httpx.AsyncClient(timeout=180) as client:
                try:
                    if req.stream:
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
                            headers={
                                "X-DGX-Usage": f"{count}/{DAILY_LIMIT}",
                                "X-DGX-Queue": "0",
                                "Cache-Control": "no-cache, no-transform",
                                "X-Accel-Buffering": "no",
                                "Connection": "keep-alive",
                                "Transfer-Encoding": "chunked",
                            },
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
                    raise HTTPException(status_code=503, detail="LM Studio 서버에 연결할 수 없습니다.")
                except Exception as e:
                    return JSONResponse(status_code=500, content={"error": str(e)})
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ============================================================
# PART 4 — 사용량 조회
# ============================================================

@app.get("/api/usage")
async def get_usage(request: Request):
    """현재 사용자의 일일 사용량 조회"""
    user_id = get_user_id(request)
    user_tier = request.headers.get("x-user-tier", "none")
    limit = GUEST_LIMIT if user_tier == "none" else DAILY_LIMIT
    today = time.strftime("%Y-%m-%d")
    entry = rate_limits.get(user_id, {"date": today, "count": 0})
    if entry["date"] != today:
        return {"user_id": user_id, "date": today, "count": 0, "limit": limit, "remaining": limit, "tier": user_tier}
    return {
        "user_id": user_id,
        "date": today,
        "count": entry["count"],
        "limit": limit,
        "remaining": max(0, limit - entry["count"]),
        "tier": user_tier,
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
