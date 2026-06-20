#!/usr/bin/env bash
# ============================================================
# Loreguard Pre-commit Hook
#
# 커밋 전 자동 5축 검증. 임계 미달 시 commit 차단.
#
# Setup:
#   1. .git/hooks/pre-commit 에 본 파일 복사
#   2. chmod +x .git/hooks/pre-commit
#   3. .env 또는 git config 에 LOREGUARD_LSP_TOKEN 설정
#
# 또는 husky 사용:
#   "husky": { "hooks": { "pre-commit": "scripts/loreguard-pre-commit.sh" } }
#
# 카테고리 정합 ✓ — CI 와 동일 방향 (작가 워크플로우 → Loreguard).
# ============================================================

set -e

THRESHOLD="${LOREGUARD_THRESHOLD:-70}"
MANUSCRIPT="${LOREGUARD_MANUSCRIPT:-manuscript.md}"
# [정합 재조정 — 2026-05-07] "우리는 선생이 아니다."
# 기본 mode = warn (정보 only). 작가가 명시 LOREGUARD_MODE=block 시만 차단.
MODE="${LOREGUARD_MODE:-warn}"

# manuscript 파일 존재 확인
if [ ! -f "$MANUSCRIPT" ]; then
  echo "ℹ Loreguard: no manuscript file ($MANUSCRIPT) — skipping lint"
  exit 0
fi

# 변경된 파일 중에 manuscript 가 있는지
if ! git diff --cached --name-only | grep -q "$MANUSCRIPT"; then
  echo "ℹ Loreguard: $MANUSCRIPT not in staged changes — skipping"
  exit 0
fi

# 토큰 확인
if [ -z "$LOREGUARD_LSP_TOKEN" ]; then
  echo "⚠ Loreguard: LOREGUARD_LSP_TOKEN not set — skipping (set env to enable)"
  exit 0
fi

# CLI 사용 가능 확인
if ! command -v loreguard &> /dev/null; then
  echo "⚠ Loreguard: 'loreguard' CLI not installed (npm install -g @loreguard/cli) — skipping"
  exit 0
fi

echo "▶ Loreguard pre-commit lint..."
result=$(loreguard lint "$MANUSCRIPT" --format=json 2>/dev/null || echo '{"overallScore":0}')
score=$(echo "$result" | grep -o '"overallScore":[0-9]*' | cut -d':' -f2)
score=${score:-0}

echo "  Score: $score / 100 (threshold: $THRESHOLD, mode: $MODE)"

if [ "$score" -lt "$THRESHOLD" ]; then
  if [ "$MODE" = "block" ]; then
    echo "❌ Loreguard: score below threshold — commit blocked (LOREGUARD_MODE=block)"
    echo "   To bypass: git commit --no-verify"
    echo "   To switch to info-only: unset LOREGUARD_MODE or set LOREGUARD_MODE=warn"
    exit 1
  else
    echo "ℹ Loreguard: score below threshold — info only (LOREGUARD_MODE=warn)"
    echo "   To enable block: export LOREGUARD_MODE=block"
  fi
else
  echo "✓ Loreguard: score above threshold"
fi
exit 0
