#!/bin/bash
# ============================================================
# EH Universe — DGX 서버 원클릭 배포 스크립트
# ============================================================
# DGX 서버에서 이 스크립트 실행:
#   curl -sSL https://raw.githubusercontent.com/gilheumpark-bit/eh-universe-web/master/scripts/deploy-dgx.sh | bash
# 또는:
#   bash scripts/deploy-dgx.sh
# ============================================================

set -euo pipefail

echo "============================================================"
echo " EH Universe — DGX 서버 배포"
echo "============================================================"

# ── 1. 코드 동기화 ──
REPO_DIR="${HOME}/eh-universe-web"
if [ -d "${REPO_DIR}" ]; then
  echo "[1/5] 기존 레포 업데이트..."
  cd "${REPO_DIR}"
  git fetch origin master
  git reset --hard origin/master
else
  echo "[1/5] 레포 클론..."
  git clone https://github.com/gilheumpark-bit/eh-universe-web.git "${REPO_DIR}"
  cd "${REPO_DIR}"
fi

# ── 2. Python 의존성 ──
echo "[2/5] Python 패키지 설치..."
pip install -q fastapi uvicorn httpx pydantic 2>/dev/null || pip3 install -q fastapi uvicorn httpx pydantic

# ── 3. 기존 프로세스 정리 ──
echo "[3/5] 기존 프로세스 정리..."
pkill -f "vllm.entrypoints" 2>/dev/null || true
pkill -f "main:app" 2>/dev/null || true
sleep 2

# ── 4. vLLM 듀얼 엔진 기동 ──
echo "[4/5] vLLM 듀얼 엔진 시작..."
echo "  Heavy (35B) → :8080"
echo "  Fast  (0.8B) → :8081"
chmod +x scripts/start_vllm.sh
nohup bash scripts/start_vllm.sh both > /tmp/vllm-dual.log 2>&1 &
VLLM_PID=$!
echo "  vLLM PID: ${VLLM_PID}"

# vLLM 로딩 대기 (모델 로딩에 30~60초 소요)
echo "  모델 로딩 대기 (최대 120초)..."
for i in $(seq 1 120); do
  if curl -s http://localhost:8080/v1/models >/dev/null 2>&1; then
    echo "  Heavy Core 준비 완료! (${i}초)"
    break
  fi
  sleep 1
done

for i in $(seq 1 60); do
  if curl -s http://localhost:8081/v1/models >/dev/null 2>&1; then
    echo "  Fast Core 준비 완료! (${i}초)"
    break
  fi
  sleep 1
done

# ── 5. FastAPI 프록시 기동 ──
echo "[5/5] FastAPI 프록시 서버 시작 (:8000)..."
cd "${REPO_DIR}/ai-spark-server"
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /tmp/fastapi-proxy.log 2>&1 &
PROXY_PID=$!
echo "  Proxy PID: ${PROXY_PID}"
sleep 3

# ── 검증 ──
echo ""
echo "============================================================"
echo " 배포 완료 — 상태 확인"
echo "============================================================"

check_port() {
  local name=$1 port=$2
  if curl -s --connect-timeout 3 "http://localhost:${port}/" >/dev/null 2>&1; then
    echo "  ✅ ${name} (:${port}) — OK"
  else
    echo "  ❌ ${name} (:${port}) — 응답 없음 (로그: /tmp/*.log)"
  fi
}

check_port "FastAPI Proxy" 8000
check_port "Heavy Core (35B)" 8080
check_port "Fast Core (0.8B)" 8081
check_port "ComfyUI (FLUX)" 8188

echo ""
echo "로그 확인:"
echo "  tail -f /tmp/vllm-dual.log"
echo "  tail -f /tmp/fastapi-proxy.log"
echo "============================================================"
