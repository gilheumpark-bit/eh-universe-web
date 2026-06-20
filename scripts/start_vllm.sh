#!/bin/bash
# ============================================================
# EH Universe — vLLM Dual-Engine Launcher
# ============================================================
# Heavy Core (8080): Qwen 35B — 세계관, 번역, 복잡 분석
# Fast Core  (8081): Qwen 0.8B — 초고속 집필, 자동완성
# Image Core (8188): ComfyUI FLUX.1 — 별도 실행
# ============================================================

set -euo pipefail

# ── Heavy Core Configuration ──
HEAVY_MODEL="${VLLM_HEAVY_MODEL:-Qwen/Qwen2.5-32B-Instruct-AWQ}"
HEAVY_DRAFT="${VLLM_HEAVY_DRAFT:-Qwen/Qwen2.5-1.5B-Instruct}"
HEAVY_PORT="${VLLM_HEAVY_PORT:-8080}"
HEAVY_GPU_UTIL="${VLLM_HEAVY_GPU_UTIL:-0.70}"
HEAVY_MAX_LEN="${VLLM_HEAVY_MAX_LEN:-8192}"
HEAVY_SERVED="${VLLM_HEAVY_SERVED:-qwen-35b-heavy}"

# ── Fast Core Configuration ──
FAST_MODEL="${VLLM_FAST_MODEL:-Qwen/Qwen2.5-0.5B-Instruct}"
FAST_PORT="${VLLM_FAST_PORT:-8081}"
FAST_GPU_UTIL="${VLLM_FAST_GPU_UTIL:-0.05}"
FAST_MAX_LEN="${VLLM_FAST_MAX_LEN:-4096}"
FAST_SERVED="${VLLM_FAST_SERVED:-qwen-0.8b-fast}"

MODE="${1:-both}"  # both | heavy | fast

start_heavy() {
  echo "============================================================"
  echo " Heavy Core — ${HEAVY_MODEL}"
  echo " + Speculative: ${HEAVY_DRAFT}"
  echo " Port: ${HEAVY_PORT} | GPU: ${HEAVY_GPU_UTIL}"
  echo "============================================================"
  python3 -m vllm.entrypoints.openai.api_server \
    --model "${HEAVY_MODEL}" \
    --speculative-model "${HEAVY_DRAFT}" \
    --num-speculative-tokens 5 \
    --enable-prefix-caching \
    --enable-chunked-prefill \
    --gpu-memory-utilization "${HEAVY_GPU_UTIL}" \
    --max-model-len "${HEAVY_MAX_LEN}" \
    --port "${HEAVY_PORT}" \
    --served-model-name "${HEAVY_SERVED}" \
    --trust-remote-code &
  echo "Heavy Core PID: $!"
}

start_fast() {
  echo "============================================================"
  echo " Fast Core — ${FAST_MODEL}"
  echo " Port: ${FAST_PORT} | GPU: ${FAST_GPU_UTIL}"
  echo "============================================================"
  python3 -m vllm.entrypoints.openai.api_server \
    --model "${FAST_MODEL}" \
    --gpu-memory-utilization "${FAST_GPU_UTIL}" \
    --max-model-len "${FAST_MAX_LEN}" \
    --port "${FAST_PORT}" \
    --served-model-name "${FAST_SERVED}" \
    --trust-remote-code &
  echo "Fast Core PID: $!"
}

case "${MODE}" in
  heavy) start_heavy ;;
  fast)  start_fast ;;
  both)
    start_heavy
    sleep 5
    start_fast
    echo ""
    echo "Both engines running. Heavy:${HEAVY_PORT} Fast:${FAST_PORT}"
    wait
    ;;
  *) echo "Usage: $0 [both|heavy|fast]"; exit 1 ;;
esac
