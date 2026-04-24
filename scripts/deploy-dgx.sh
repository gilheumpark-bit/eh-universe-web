#!/bin/bash
# ============================================================
# EH Universe — DGX 서버 원클릭 배포 (35B MoE 단일, 2026-04-24 갱신)
# ============================================================
# 2026-04-20 아키텍처 전환:
#   OLD: 9B 쌍포(Engine A/B) + Nginx LB(8090) + FastAPI 프록시(8000) — 폐기
#   NEW: Qwen 3.6-35B-A3B-FP8 MoE 단일 (vLLM :8001, OpenAI 호환 SSE 직결)
# 프록시 레이어 불필요 — vLLM 엔드포인트가 stream:true 시 직접 SSE 송출.
# 동기화 기준: CLAUDE.md §인프라 연동 (2026-04-23 갱신본)
# ============================================================
#
# 실행 (DGX 서버):
#   curl -sSL https://raw.githubusercontent.com/gilheumpark-bit/eh-universe-web/master/scripts/deploy-dgx.sh | bash
#   # 또는
#   bash scripts/deploy-dgx.sh
# ============================================================

set -euo pipefail

echo "============================================================"
echo " EH Universe — DGX 35B MoE 단일 엔진 배포"
echo "============================================================"

# ── 1. 코드 동기화 ──
REPO_DIR="${HOME}/eh-universe-web"
if [ -d "${REPO_DIR}" ]; then
  echo "[1/3] 기존 레포 업데이트..."
  cd "${REPO_DIR}"
  git fetch origin master
  git reset --hard origin/master
else
  echo "[1/3] 레포 클론..."
  git clone https://github.com/gilheumpark-bit/eh-universe-web.git "${REPO_DIR}"
  cd "${REPO_DIR}"
fi

# ── 2. 기존 프로세스 정리 ──
echo "[2/3] 기존 프로세스 정리..."
pkill -f "vllm.entrypoints" 2>/dev/null || true
# 2026-04-20 이전 듀얼 9B 엔진 + FastAPI 프록시(main:app) 잔재 정리
pkill -f "main:app" 2>/dev/null || true
sleep 2

# ── 3. vLLM 35B MoE 단일 엔진 기동 (:8001) ──
echo "[3/3] Qwen 3.6-35B-A3B-FP8 MoE 시작 (vLLM :8001)..."
chmod +x scripts/start_vllm.sh
# 'both' 인자 제거 — 듀얼 모드 폐기. start_vllm.sh 자체도 단일 기본값으로 갱신 필요 (별도 커밋).
nohup bash scripts/start_vllm.sh > /tmp/vllm-35b.log 2>&1 &
VLLM_PID=$!
echo "  vLLM PID: ${VLLM_PID}"

# 모델 로딩 대기 (35B MoE 60~90초 소요)
echo "  모델 로딩 대기 (최대 180초)..."
for i in $(seq 1 180); do
  if curl -s http://localhost:8001/v1/models >/dev/null 2>&1; then
    echo "  35B MoE 준비 완료! (${i}초)"
    break
  fi
  sleep 1
done

# ── 검증 ──
echo ""
echo "============================================================"
echo " 배포 완료 — 상태 확인"
echo "============================================================"

check_port() {
  local name=$1 port=$2
  if curl -s --connect-timeout 3 "http://localhost:${port}/" >/dev/null 2>&1; then
    echo "  OK ${name} (:${port})"
  else
    echo "  FAIL ${name} (:${port}) — 응답 없음 (로그: /tmp/vllm-35b.log)"
  fi
}

check_port "vLLM 35B MoE"   8001
check_port "RAG API"         8082
check_port "ComfyUI (FLUX)"  8188

echo ""
echo "SSE 스트리밍: vLLM OpenAI 호환 엔드포인트가 직접 송출 (별도 프록시 레이어 불필요)"
echo "로그 확인:    tail -f /tmp/vllm-35b.log"
echo ""
echo "운영 메모:"
echo "  - --reload 플래그 사용 금지 (프로덕션 무단 재시작·inotify 폴링 리스크)"
echo "  - systemd 전환 예정 — /etc/systemd/system/vllm-35b.service"
echo "  - Cloudflare Tunnel 차단 중 — 192.168 내부망 직결 운용 (CLAUDE.md:187-188)"
echo "============================================================"
