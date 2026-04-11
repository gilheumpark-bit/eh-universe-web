from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from spark_engine import spark_engine

app = FastAPI(title="EH Universe DGX Spark Server")

# Vercel 프론트엔드 통신을 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # TODO: 운영 환경에서는 특정 도메인(Vercel URL)으로 제한해야 합니다.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    model: str
    messages: list[dict]
    temperature: float = 0.7

@app.get("/")
def health_check():
    spark = spark_engine.get_session()
    return {"status": "ok", "spark_version": spark.version}

@app.post("/v1/chat/completions")
async def chat_completions(req: ChatRequest):
    """
    OpenAI 호환 챗봇 엔드포인트.
    Next.js의 기존 LocalProvider 연동 구조를 최대한 활용하기 위한 형식입니다.
    """
    # TODO: 실제 DGX 모델 추론 로직 연동 (현재는 Mock Response)
    response_text = "이것은 DGX 스파크 서버에서 반환된 응답입니다.\n요청된 모델: " + req.model
    
    return {
        "id": "chatcmpl-dgx",
        "object": "chat.completion",
        "created": 1,
        "model": req.model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_text,
            },
            "finish_reason": "stop"
        }]
    }

@app.post("/api/spark/analyze")
async def analyze_data(query: str):
    """
    고급 데이터 분석용 라우트 예시입니다.
    """
    spark = spark_engine.get_session()
    # TODO: spark 연산 수행
    return {"query": query, "result": "Spark processing completed"}

@app.post("/api/sandbox/execute")
async def execute_code_securely(code_payload: dict):
    """
    Code Studio 연동: 
    사용자가 생성한 코드를 Vercel에서 받아 스파크 서버(DGX) 내부의 격리된 환경(샌드박스)에서 검증합니다.
    """
    # TODO: Docker API나 격리된 Python 프로세스를 사용하여 코드 안전 실행
    # 사장님이 구축하신 '자체 검증 로직'과 '샌드박스'를 이곳에 연결합니다.
    source_code = code_payload.get("code", "")
    
    # 임시 검증 결과
    return {
        "status": "success",
        "output": "샌드박스 내 코드 실행 및 검증 완료",
        "security_check": "Safe (No vulnerability detected by DGX Anti-Gravity Sandbox)",
        "gemma_feedback": f"Gemma-4 엔진의 코드 리뷰 결과: 완벽합니다."
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
