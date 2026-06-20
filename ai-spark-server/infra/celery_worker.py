# ============================================================
# EH Universe — Celery Background Worker
# ============================================================
# Redis + Celery 기반 백그라운드 생성 큐
# vLLM 32B+1.5B 엔진으로 장문 소설 비동기 생성
# ============================================================

import os
import requests
from celery import Celery

# ── Configuration ──
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
VLLM_API_URL = os.getenv("VLLM_API_URL", "http://localhost:8000/v1/chat/completions")

# ── Celery App ──
app = Celery(
    "universe_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
    # 동시 워커 수: vLLM의 Chunked Prefill이 병렬 처리하므로
    # CPU 코어 수 기반으로 설정 (기본 8, 환경변수로 조정)
    worker_concurrency=int(os.getenv("CELERY_CONCURRENCY", "8")),
    worker_prefetch_multiplier=4,
    # 태스크 타임아웃: 장문 생성 최대 10분
    task_soft_time_limit=540,
    task_time_limit=600,
)


@app.task(bind=True)
def background_generate(self, prompt: str, settings: dict):
    """
    백그라운드 소설/번역 생성 태스크.
    사용자가 브라우저를 닫아도 서버에서 완료 후 결과 저장.
    """
    self.update_state(
        state="PROGRESS",
        meta={"status": "vLLM 32B+1.5B 엔진으로 생성 시작..."},
    )

    payload = {
        "model": settings.get("model", "eh-universe-30b-fast"),
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": min(settings.get("max_tokens", 8192), 12000),
        "temperature": settings.get("temperature", 0.7),
        "top_p": settings.get("top_p", 0.9),
        "stream": False,
    }

    try:
        response = requests.post(
            VLLM_API_URL,
            json=payload,
            timeout=600,
        )
        response.raise_for_status()

        result_text = response.json()["choices"][0]["message"]["content"]
        return {"status": "completed", "result": result_text}

    except requests.Timeout:
        self.update_state(state="FAILURE", meta={"error": "생성 타임아웃 (10분 초과)"})
        return {"status": "failed", "error": "timeout"}
    except Exception as e:
        self.update_state(state="FAILURE", meta={"error": str(e)})
        return {"status": "failed", "error": str(e)}
