'use client';

// ============================================================
// UserRoleContext — 역할 기반 UI + Tier(Progressive Disclosure) 전역 상태
// VS Code 방식: 첫 화면은 단순, 고급은 opt-in.
// 역할(role) → 기본 진입 화면 결정 / Tier(tier) → UI 노출 단계 결정
// localStorage 영속성, Provider 외부 접근 안전(useUserRoleSafe).
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ============================================================
// PART 1 — 타입 / 상수
// ============================================================

export type UserRole = 'writer' | 'translator' | 'publisher' | 'developer' | 'explorer';
export type UIMode = 'tier1' | 'tier2' | 'tier3';

const STORAGE = {
  role: 'noa_user_role',
  tier: 'noa_ui_tier',
  developer: 'noa_developer_mode',
  advancedWriting: 'noa_advanced_writing',
} as const;

const VALID_ROLES: UserRole[] = ['writer', 'translator', 'publisher', 'developer', 'explorer'];
const VALID_TIERS: UIMode[] = ['tier1', 'tier2', 'tier3'];

// ============================================================
// PART 2 — Context 인터페이스 / 기본값
// ============================================================

interface UserRoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  tier: UIMode;
  setTier: (tier: UIMode) => void;
  developerMode: boolean;
  setDeveloperMode: (on: boolean) => void;
  advancedWritingMode: boolean;
  setAdvancedWritingMode: (on: boolean) => void;
}

const Context = createContext<UserRoleContextValue | null>(null);

// ============================================================
// PART 3 — 안전한 localStorage 헬퍼 (private 모드/quota 방어)
// ============================================================

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode — silent */
  }
}

// ============================================================
// PART 4 — Provider
// ============================================================

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('explorer');
  const [tier, setTierState] = useState<UIMode>('tier1');
  const [developerMode, setDeveloperState] = useState(false);
  const [advancedWritingMode, setAdvancedState] = useState(false);

  // 초기 hydration — SSR safe
  useEffect(() => {
    const savedRole = safeGet(STORAGE.role);
    const savedTier = safeGet(STORAGE.tier);
    const savedDev = safeGet(STORAGE.developer) === '1';
    const savedAdv = safeGet(STORAGE.advancedWriting) === '1';

    if (savedRole && (VALID_ROLES as string[]).includes(savedRole)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoleState(savedRole as UserRole);
    }
    if (savedTier && (VALID_TIERS as string[]).includes(savedTier)) {
      setTierState(savedTier as UIMode);
    }
    setDeveloperState(savedDev);
    setAdvancedState(savedAdv);
  }, []);

  const setRole = useCallback((r: UserRole) => {
    setRoleState(r);
    safeSet(STORAGE.role, r);
    // 개발자 role 선택 시 developerMode 자동 활성화
    if (r === 'developer') {
      setDeveloperState(true);
      safeSet(STORAGE.developer, '1');
    }
  }, []);

  const setTier = useCallback((t: UIMode) => {
    setTierState(t);
    safeSet(STORAGE.tier, t);
  }, []);

  const setDeveloperMode = useCallback((on: boolean) => {
    setDeveloperState(on);
    safeSet(STORAGE.developer, on ? '1' : '0');
  }, []);

  const setAdvancedWritingMode = useCallback((on: boolean) => {
    setAdvancedState(on);
    safeSet(STORAGE.advancedWriting, on ? '1' : '0');
  }, []);

  // [G] context value 메모이제이션 — re-render 최소화
  const value = useMemo<UserRoleContextValue>(
    () => ({
      role,
      setRole,
      tier,
      setTier,
      developerMode,
      setDeveloperMode,
      advancedWritingMode,
      setAdvancedWritingMode,
    }),
    [role, tier, developerMode, advancedWritingMode, setRole, setTier, setDeveloperMode, setAdvancedWritingMode],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// ============================================================
// PART 5 — Hooks (strict / safe)
// ============================================================

/** strict — Provider 밖에서 호출 시 throw. Studio 등 항상 마운트되는 영역에서 사용. */
export function useUserRole(): UserRoleContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useUserRole must be used within UserRoleProvider');
  return ctx;
}

/** safe — Provider 밖에서도 null 반환. layout 외부/마운트 전 컴포넌트 안전. */
export function useUserRoleSafe(): UserRoleContextValue | null {
  return useContext(Context);
}

/** 개발자 모드 활성 여부만 빠르게 체크 (re-render 최소화) */
export function useIsDeveloperMode(): boolean {
  const ctx = useUserRoleSafe();
  return ctx?.developerMode ?? false;
}

/** Code Studio 접근 가능 여부 — developer role || developerMode */
export function useCanAccessCodeStudio(): boolean {
  const ctx = useUserRoleSafe();
  return ctx?.role === 'developer' || ctx?.developerMode === true;
}
