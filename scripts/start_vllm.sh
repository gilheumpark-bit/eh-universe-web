#!/bin/bash
# ============================================================
# EH Universe — vLLM Launcher (32B + 1.5B Speculative Decoding)
# ============================================================
# DGX Spark (128GB VRAM)
# Main: Qwen2.5-32B-Instruct-AWQ
# Draft: Qwen2.5-1.5B (Speculative Decoding, 5 tokens lookahead)
# Reserved: ~24GB for FLUX.1 image generation
# ============================================================

set -euo pipefail

# ── Configuration (override via environment) ──
MAIN_MODEL="${VLLM_MAIN_MODEL:-Qwen/Qwen2.5-32B-Instruct-AWQ}"
DRAFT_MODEL="${VLLM_DRAFT_MODEL:-Qwen/Qwen2.5-1.5B-Instruct}"
PORT="${VLLM_PORT:-8000}"
GPU_UTIL="${VLLM_GPU_UTIL:-0.75}"
MAX_MODEL_LEN="${VLLM_MAX_MODEL_LEN:-8192}"
SPEC_TOKENS="${VLLM_SPEC_TOKENS:-5}"
SERVED_NAME="${VLLM_SERVED_NAME:-eh-universe-30b-fast}"

echo "============================================================"
echo " EH Universe — vLLM Engine"
echo " Main : ${MAIN_MODEL}"
echo " Draft: ${DRAFT_MODEL} (${SPEC_TOKENS} speculative tokens)"
echo " Port : ${PORT}"
echo " GPU  : ${GPU_UTIL} utilization (~96GB / 128GB)"
echo "============================================================"

python3 -m vllm.entrypoints.openai.api_server \
  --model "${MAIN_MODEL}" \
  --speculative-model "${DRAFT_MODEL}" \
  --num-speculative-tokens "${SPEC_TOKENS}" \
  --enable-prefix-caching \
  --enable-chunked-prefill \
  --gpu-memory-utilization "${GPU_UTIL}" \
  --max-model-len "${MAX_MODEL_LEN}" \
  --port "${PORT}" \
  --served-model-name "${SERVED_NAME}" \
  --trust-remote-code
