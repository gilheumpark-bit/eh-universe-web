"use client";

// ============================================================
// [P0 브리지 — 2026-06-10] LoreguardTabContext
// 새 6탭 셸의 탭 전환 수단을 탭 컴포넌트에 제공한다.
// 배경: 구 context 의 setActiveTab(AppTab) 은 구 11탭 ID 기준이라
// 새 셸(LoreguardTabId 로컬 state)에서는 무반응 → 탭 내부에서
// "연출/원고함" 류 내비가 죽는다. 새 셸 전환은 반드시 이 컨텍스트로.
// ============================================================

import { createContext, useContext } from "react";
import type { LoreguardTabId } from "./LoreguardShell";

export interface LoreguardTabContextValue {
  activeTab: LoreguardTabId;
  setActiveTab: (id: LoreguardTabId) => void;
}

const LoreguardTabContext = createContext<LoreguardTabContextValue | null>(null);

export const LoreguardTabProvider = LoreguardTabContext.Provider;

/** 새 셸 탭 전환 훅 — LoreguardStudio 하위에서만 사용 가능. */
export function useLoreguardTab(): LoreguardTabContextValue {
  const ctx = useContext(LoreguardTabContext);
  if (!ctx) throw new Error("useLoreguardTab must be used within <LoreguardTabProvider>");
  return ctx;
}
