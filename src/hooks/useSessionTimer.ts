// ============================================================
// useSessionTimer — 작가 피로도 관리 훅
// ============================================================
// 세션 경과 시간 + 일일 누적 + 휴식 알림 + 포모도로 사이클.
// SSR 안전, localStorage 실패 가드, 1초 간격 setInterval + cleanup.
//
// 설계 원칙:
//  - 1초 interval 하나만 운영 → 과도한 재렌더 방지
//  - 일일 누적은 localStorage 저장, 날짜 변경 시 자동 리셋
//  - 포모도로는 config로 on/off, 사이클은 state로 추적
//  - 휴식 알림은 dispatchEvent(noa:alert) 방식 (기존 패턴 재사용)
// ============================================================

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logger } from "@/lib/logger";

// ============================================================
// PART 1 — 타입 정의
// ============================================================

export interface SessionState {
  /** 세션 시작 시각 (epoch ms) */
  startedAt: number;
  /** 세션 시작 이후 경과 (ms) */
  elapsed: number;
  /** 마지막 휴식 이후 경과 (ms) — 휴식 알림 기준 */
  elapsedSinceBreak: number;
  /** 오늘 누적 집필 시간 (ms) — localStorage 저장 */
  dailyTotal: number;
  /** 세션 내 휴식 횟수 */
  breakCount: number;
  /** 포모도로 현재 단계 */
  pomodoroPhase: "work" | "short-break" | "long-break" | "off";
  /** 포모도로 잔여 시간 (ms). off면 0 */
  pomodoroRemaining: number;
  /** 현재 포모도로 사이클 번호 (긴 휴식 계산용) */
  pomodoroCycle: number;
}

export interface SessionConfig {
  pomodoroEnabled: boolean;
  pomodoroWorkMs: number;
  pomodoroBreakMs: number;
  pomodoroLongBreakMs: number;
  pomodoroCyclesBeforeLongBreak: number;
  /** 휴식 권장 알림 임계치 (ms) — 이 시간 동안 쉬지 않으면 알림 */
  restAlertMs: number;
  /** 일일 목표 글자 수 */
  dailyGoalChars: number;
}

export interface UseSessionTimerOptions {
  /** 현재 본문 글자 수(공백 제외). 진행률 계산에 사용 */
  totalChars: number;
}

export interface UseSessionTimerReturn {
  state: SessionState;
  config: SessionConfig;
  setConfig: (partial: Partial<SessionConfig>) => void;
  startPomodoro: () => void;
  stopPomodoro: () => void;
  resetDaily: () => void;
  /** 0~1, 일일 목표 대비 글자수 비율 */
  progress: number;
  /** true면 UI에서 휴식 배지/툴팁 강조, 이벤트는 자동 1회 발행됨 */
  restAlertDue: boolean;
  /** 사용자가 알림 확인 시 호출 — elapsedSinceBreak 리셋 */
  dismissRestAlert: () => void;
}

// ============================================================
// PART 2 — 기본값 + localStorage 키 + 직렬화 유틸
// ============================================================

const LS_KEYS = {
  daily: "noa_session_daily_total", // { date: 'YYYY-MM-DD', ms: number }
  config: "noa_session_config",
} as const;

const DEFAULT_CONFIG: SessionConfig = {
  pomodoroEnabled: false,
  pomodoroWorkMs: 25 * 60 * 1000,
  pomodoroBreakMs: 5 * 60 * 1000,
  pomodoroLongBreakMs: 15 * 60 * 1000,
  pomodoroCyclesBeforeLongBreak: 4,
  restAlertMs: 50 * 60 * 1000,
  dailyGoalChars: 5000,
};

const TICK_MS = 1000;
const LOG_CTX = "useSessionTimer";

function todayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** localStorage 안전 get — 실패 시 null */
function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    logger.warn(LOG_CTX, `localStorage.getItem(${key}) failed`, err);
    return null;
  }
}

/** localStorage 안전 set — 실패 시 warn 후 무시 */
function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    logger.warn(LOG_CTX, `localStorage.setItem(${key}) failed (quota?)`, err);
  }
}

interface DailyRecord {
  date: string;
  ms: number;
}

function loadDaily(nowMs: number): DailyRecord {
  const raw = safeGet(LS_KEYS.daily);
  const today = todayKey(nowMs);
  if (!raw) return { date: today, ms: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<DailyRecord>;
    if (
      parsed &&
      typeof parsed.date === "string" &&
      typeof parsed.ms === "number" &&
      parsed.date === today &&
      parsed.ms >= 0
    ) {
      return { date: parsed.date, ms: parsed.ms };
    }
    // 날짜 달라짐 → 리셋
    return { date: today, ms: 0 };
  } catch (err) {
    logger.warn(LOG_CTX, "daily record parse failed — reset", err);
    return { date: today, ms: 0 };
  }
}

function saveDaily(record: DailyRecord): void {
  safeSet(LS_KEYS.daily, JSON.stringify(record));
}

function loadConfig(): SessionConfig {
  const raw = safeGet(LS_KEYS.config);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(raw) as Partial<SessionConfig>;
    // 부분 병합 — 누락 키는 기본값 사용
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    logger.warn(LOG_CTX, "config parse failed — using defaults", err);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg: SessionConfig): void {
  safeSet(LS_KEYS.config, JSON.stringify(cfg));
}

// ============================================================
// PART 3 — 메인 훅
// ============================================================

export function useSessionTimer({
  totalChars,
}: UseSessionTimerOptions): UseSessionTimerReturn {
  // 초기값은 SSR 안전 — 0으로 시작하고 마운트 후 보정
  const [config, setConfigState] = useState<SessionConfig>(() => DEFAULT_CONFIG);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [lastBreakAt, setLastBreakAt] = useState<number>(0);
  const [dailyMs, setDailyMs] = useState<number>(0);
  const [dailyDate, setDailyDate] = useState<string>("");
  const [breakCount, setBreakCount] = useState<number>(0);

  // 포모도로 상태
  const [pomodoroPhase, setPomodoroPhase] = useState<SessionState["pomodoroPhase"]>("off");
  const [pomodoroPhaseStartedAt, setPomodoroPhaseStartedAt] = useState<number>(0);
  const [pomodoroCycle, setPomodoroCycle] = useState<number>(0);

  // 휴식 알림 1회성 발행 가드
  const restAlertFiredRef = useRef<boolean>(false);

  // 일일 누적 저장 throttle — 매초 디스크 쓰기 방지 (30초 간격)
  const lastDailyFlushRef = useRef<number>(0);

  // ============================================================
  // PART 3.1 — 마운트 초기화 (SSR 안전)
  // ============================================================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = Date.now();
    const daily = loadDaily(t);
    const cfg = loadConfig();
    setConfigState(cfg);
    setDailyMs(daily.ms);
    setDailyDate(daily.date);
    setStartedAt(t);
    setLastBreakAt(t);
    setNow(t);
  }, []);

  // ============================================================
  // PART 3.2 — 1초 interval: 시간 tick + 일일 누적 + 포모도로
  // ============================================================
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (startedAt === 0) return; // 마운트 전
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);

      // 날짜 변경 감지 (자정 넘김) → 누적 리셋
      const key = todayKey(t);
      setDailyDate((prev) => {
        if (prev && prev !== key) {
          setDailyMs(0);
          saveDaily({ date: key, ms: 0 });
          return key;
        }
        return prev || key;
      });

      // 일일 누적 증가 (세션 활성 중만)
      setDailyMs((prev) => {
        const next = prev + TICK_MS;
        // 30초에 한 번만 localStorage flush
        if (t - lastDailyFlushRef.current >= 30_000) {
          lastDailyFlushRef.current = t;
          saveDaily({ date: key, ms: next });
        }
        return next;
      });
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
      // 언마운트 시 최종 flush (현재 날짜 기준)
      if (dailyDate) {
        saveDaily({ date: dailyDate, ms: dailyMs });
      }
    };
    // dailyDate/dailyMs는 최신값을 flush에 사용하되 의존성 발산 방지 위해 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  // ============================================================
  // PART 3.3 — 휴식 알림 (restAlertMs 경과 시 1회 이벤트)
  // ============================================================
  const elapsedSinceBreak = Math.max(0, now - lastBreakAt);
  const restAlertDue = elapsedSinceBreak >= config.restAlertMs;

  useEffect(() => {
    if (!restAlertDue) {
      // 아직 임계 미도달 → 다음 사이클용 플래그 해제
      restAlertFiredRef.current = false;
      return;
    }
    if (restAlertFiredRef.current) return;
    if (typeof window === "undefined") return;
    restAlertFiredRef.current = true;
    // 기존 noa:alert 핸들러가 StudioShell에서 토스트 표시
    try {
      window.dispatchEvent(
        new CustomEvent("noa:alert", {
          detail: {
            variant: "info",
            title: "휴식 권장",
            message: "50분 집필했습니다. 5분 스트레칭 어떠세요?",
          },
        }),
      );
    } catch (err) {
      logger.warn(LOG_CTX, "rest alert dispatch failed", err);
    }
  }, [restAlertDue]);

  // ============================================================
  // PART 3.4 — 포모도로 사이클 진행
  // ============================================================
  const pomodoroRemaining = useMemo(() => {
    if (pomodoroPhase === "off") return 0;
    const phaseDuration =
      pomodoroPhase === "work"
        ? config.pomodoroWorkMs
        : pomodoroPhase === "long-break"
          ? config.pomodoroLongBreakMs
          : config.pomodoroBreakMs;
    return Math.max(0, pomodoroPhaseStartedAt + phaseDuration - now);
  }, [
    pomodoroPhase,
    pomodoroPhaseStartedAt,
    now,
    config.pomodoroWorkMs,
    config.pomodoroBreakMs,
    config.pomodoroLongBreakMs,
  ]);

  useEffect(() => {
    if (pomodoroPhase === "off") return;
    if (pomodoroRemaining > 0) return;
    if (typeof window === "undefined") return;

    // 단계 전환
    if (pomodoroPhase === "work") {
      const nextCycle = pomodoroCycle + 1;
      setPomodoroCycle(nextCycle);
      const isLong =
        nextCycle > 0 &&
        nextCycle % Math.max(1, config.pomodoroCyclesBeforeLongBreak) === 0;
      setPomodoroPhase(isLong ? "long-break" : "short-break");
      setPomodoroPhaseStartedAt(Date.now());
      try {
        window.dispatchEvent(
          new CustomEvent("noa:alert", {
            detail: {
              variant: "info",
              title: "휴식 시간",
              message: isLong
                ? "긴 휴식 시간입니다. 잠시 눈을 쉬게 하세요."
                : "짧은 휴식 시간입니다.",
            },
          }),
        );
      } catch (err) {
        logger.warn(LOG_CTX, "pomodoro break alert failed", err);
      }
    } else {
      // 휴식 종료 → 작업 재개
      setPomodoroPhase("work");
      setPomodoroPhaseStartedAt(Date.now());
      setLastBreakAt(Date.now());
      setBreakCount((b) => b + 1);
      try {
        window.dispatchEvent(
          new CustomEvent("noa:alert", {
            detail: {
              variant: "info",
              title: "작업 재개",
              message: "다시 집필을 시작하세요.",
            },
          }),
        );
      } catch (err) {
        logger.warn(LOG_CTX, "pomodoro resume alert failed", err);
      }
    }
  }, [
    pomodoroPhase,
    pomodoroRemaining,
    pomodoroCycle,
    config.pomodoroCyclesBeforeLongBreak,
  ]);

  // ============================================================
  // PART 3.5 — 공개 API
  // ============================================================
  const setConfig = useCallback((partial: Partial<SessionConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const startPomodoro = useCallback(() => {
    const t = Date.now();
    setPomodoroPhase("work");
    setPomodoroPhaseStartedAt(t);
    setPomodoroCycle(0);
    // 포모도로 시작은 설정 플래그도 켬
    setConfigState((prev) => {
      if (prev.pomodoroEnabled) return prev;
      const next = { ...prev, pomodoroEnabled: true };
      saveConfig(next);
      return next;
    });
  }, []);

  const stopPomodoro = useCallback(() => {
    setPomodoroPhase("off");
    setPomodoroPhaseStartedAt(0);
    setPomodoroCycle(0);
    setConfigState((prev) => {
      if (!prev.pomodoroEnabled) return prev;
      const next = { ...prev, pomodoroEnabled: false };
      saveConfig(next);
      return next;
    });
  }, []);

  const resetDaily = useCallback(() => {
    const t = Date.now();
    const key = todayKey(t);
    setDailyMs(0);
    setDailyDate(key);
    saveDaily({ date: key, ms: 0 });
  }, []);

  const dismissRestAlert = useCallback(() => {
    const t = Date.now();
    setLastBreakAt(t);
    setBreakCount((b) => b + 1);
    restAlertFiredRef.current = false;
  }, []);

  // ============================================================
  // PART 3.6 — 파생 값
  // ============================================================
  const elapsed = startedAt > 0 ? Math.max(0, now - startedAt) : 0;
  const progress = useMemo(() => {
    const goal = Math.max(1, config.dailyGoalChars);
    const ratio = totalChars / goal;
    return Math.max(0, Math.min(1, ratio));
  }, [totalChars, config.dailyGoalChars]);

  const state: SessionState = {
    startedAt,
    elapsed,
    elapsedSinceBreak,
    dailyTotal: dailyMs,
    breakCount,
    pomodoroPhase,
    pomodoroRemaining,
    pomodoroCycle,
  };

  return {
    state,
    config,
    setConfig,
    startPomodoro,
    stopPomodoro,
    resetDaily,
    progress,
    restAlertDue,
    dismissRestAlert,
  };
}

// ============================================================
// PART 4 — 포맷 헬퍼 (export)
// ============================================================

/** ms → "H:MM" 또는 "M:SS" (1시간 미만은 분:초) */
export function formatSessionTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** ms → "H:MM" (항상 시:분 — 일일 누적용) */
export function formatDailyTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

// IDENTITY_SEAL: useSessionTimer | role=writer-fatigue-manager | inputs=totalChars | outputs=state+config+controls
