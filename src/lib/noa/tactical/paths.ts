// ============================================================
// NOA Tactical — 5 Path Definitions
// Source: NOA v50 Adaptive Control Plane
// ============================================================

import type { TacticalPath, TacticalConfig } from "../types";
import { DEFAULT_TACTICAL_CONFIGS } from "../config";

/**
 * 5개 전술 경로 설정.
 *
 * ALLOW    — 정상 처리 (토큰 800)
 * LIMITED  — 제한 실행 (토큰 120)
 * DELAY    — 지연 처리 (10초 대기, 공격자 속도 저하)
 * HONEYPOT — 미끼 응답 (가짜 정보 제공)
 * BLOCK    — 완전 차단
 */
export const TACTICAL_PATHS: Record<TacticalPath, TacticalConfig> =
  DEFAULT_TACTICAL_CONFIGS;
