"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { app, lazyFirebaseAuth } from './firebase';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  /** Firebase UID — EH Translator·네트워크 API 등에 사용 */
  userId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  error: string | null;
  accessToken: string | null;
  refreshAccessToken: () => Promise<string | null>;
  /** Firebase ID 토큰 (Bearer API — 네트워크 에이전트 등) */
  getIdToken: () => Promise<string | null>;
}

// #22: Default values throw to surface missing AuthProvider early
const AuthContext = createContext<AuthContextType>({
  user: null,
  userId: null,
  loading: false,
  signInWithGoogle: async () => { throw new Error('AuthProvider not mounted'); },
  signOut: async () => { throw new Error('AuthProvider not mounted'); },
  isConfigured: false,
  error: null,
  accessToken: null,
  refreshAccessToken: async () => { throw new Error('AuthProvider not mounted'); },
  getIdToken: async () => { throw new Error('AuthProvider not mounted'); },
});

type ToastVariant = 'success' | 'error' | 'info';

function dispatchAuthToast(message: string, variant: ToastVariant = 'info', duration?: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('noa:toast', {
    detail: { message, variant, duration },
  }));
}

function recordAuthStage(stage: string, detail?: string): void {
  if (typeof window === 'undefined') return;
  const payload = {
    stage,
    detail: detail ?? '',
    href: window.location.href,
    at: new Date().toISOString(),
  };
  try {
    window.sessionStorage.setItem('noa_google_login_last_stage', JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable — login must still proceed.
  }
  window.dispatchEvent(new CustomEvent('noa:auth-stage', { detail: payload }));
}

function formatGoogleLoginError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const msg = (err as { message?: string })?.message ?? '';
  if (code === 'auth/unauthorized-domain') {
    return '현재 주소가 Google 로그인 허용 목록에 없습니다. Firebase Authorized domains에 이 주소를 추가해 주세요.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Google 로그인 연결이 끊겼습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (code === 'auth/operation-not-supported-in-this-environment') {
    return '현재 브라우저 환경에서 Google 로그인 이동을 시작하지 못했습니다. 일반 브라우저에서 다시 열어 주세요.';
  }
  return `Google 로그인 실패: ${code || msg || '알 수 없는 오류'}`;
}

function shouldTryPopupFirst(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function shouldFallbackToRedirect(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? '';
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/operation-not-supported-in-this-environment'
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isConfigured = app !== null;

  // Mutex for token refresh — prevents concurrent refresh popups
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    lazyFirebaseAuth().then((resolvedAuth) => {
      if (!resolvedAuth) {
        setLoading(false);
        return;
      }
      import('firebase/auth').then(({ onAuthStateChanged, getRedirectResult, GoogleAuthProvider }) => {
        getRedirectResult(resolvedAuth)
          .then((result) => {
            if (!result) return;
            const credential = GoogleAuthProvider.credentialFromResult(result);
            setAccessToken(credential?.accessToken ?? null);
            recordAuthStage('redirect-result-ok');
          })
          .catch((err: unknown) => {
            const message = formatGoogleLoginError(err);
            recordAuthStage('redirect-result-error', (err as { code?: string })?.code ?? message);
            setError(message);
          });
        unsubscribe = onAuthStateChanged(resolvedAuth, (u) => {
          setUser(u);
          setLoading(false);
          if (!u) setAccessToken(null);
        });
      }).catch((err: unknown) => {
        const message = formatGoogleLoginError(err);
        recordAuthStage('auth-module-load-error', (err as { message?: string })?.message ?? message);
        setError(message);
        setLoading(false);
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const signInWithGoogle = async () => {
    const resolvedAuth = await lazyFirebaseAuth();
    if (!resolvedAuth) {
      logger.error('Auth', 'Firebase auth is null — not initialized');
      const message = '로그인 설정을 찾지 못했습니다. .env.local의 공개 Firebase 설정을 확인해 주세요.';
      recordAuthStage('missing-auth');
      setError(message);
      dispatchAuthToast(message, 'error', 8000);
      return;
    }
    logger.info('Auth', 'signInWithGoogle called');
    setError(null);
    try {
      const startHref = typeof window !== 'undefined' ? window.location.href : '';
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      if (shouldTryPopupFirst()) {
        try {
          recordAuthStage('popup-start');
          dispatchAuthToast('Google 로그인 창을 여는 중입니다.', 'info', 2500);
          const result = await signInWithPopup(resolvedAuth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          setAccessToken(credential?.accessToken ?? null);
          recordAuthStage('popup-result-ok');
          dispatchAuthToast('Google 로그인 완료.', 'success', 3500);
          return;
        } catch (popupErr: unknown) {
          if (!shouldFallbackToRedirect(popupErr)) throw popupErr;
          recordAuthStage('popup-fallback-redirect', (popupErr as { code?: string })?.code);
        }
      }

      recordAuthStage('redirect-start');
      dispatchAuthToast('Google 로그인 화면으로 이동 중입니다.', 'info', 2500);
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        window.setTimeout(() => {
          const stillOnSamePage = window.location.href === startHref;
          if (!stillOnSamePage || resolvedAuth.currentUser) return;
          const message = 'Google 로그인 화면이 열리지 않았습니다. 현재 앱 주소를 새로고침한 뒤 다시 눌러 주세요.';
          recordAuthStage('redirect-no-navigation');
          setError(message);
          dispatchAuthToast(message, 'error', 9000);
        }, 1800);
      }
      await signInWithRedirect(resolvedAuth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? '';
      const message = formatGoogleLoginError(err);
      recordAuthStage('redirect-error', code || msg);
      setError(message);
      dispatchAuthToast(message, 'error', 9000);
      logger.error('Auth', 'signInWithGoogle error:', code, msg);
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const resolvedAuth = await lazyFirebaseAuth();
    if (!resolvedAuth) return null;

    // Mutex: if a refresh is already in progress, await the same promise
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const doRefresh = async (): Promise<string | null> => {
      try {
        const { GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup } = await import('firebase/auth');
        
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');

        let credential: import('firebase/auth').OAuthCredential | null = null;
        const currentUser = resolvedAuth.currentUser;

        if (currentUser) {
          try {
            const result = await reauthenticateWithPopup(currentUser, provider);
            credential = GoogleAuthProvider.credentialFromResult(result);
          } catch {
            const result = await signInWithPopup(resolvedAuth, provider);
            credential = GoogleAuthProvider.credentialFromResult(result);
          }
        } else {
          const result = await signInWithPopup(resolvedAuth, provider);
          credential = GoogleAuthProvider.credentialFromResult(result);
        }

        const token = credential?.accessToken ?? null;
        setAccessToken(token);
        return token;
      } catch {
        // 토큰 갱신 실패 — accessToken을 null로 설정하여 이후 Drive 호출이 자연스럽게 실패하도록
        setAccessToken(null);
        setError('Google Drive 토큰 갱신 실패: 재로그인이 필요합니다.');
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = doRefresh();
    return refreshPromiseRef.current;
  }, []);

  const signOut = async () => {
    const resolvedAuth = await lazyFirebaseAuth();
    if (!resolvedAuth) return;
    setAccessToken(null);
    // [M-09 / G-01 — 2026-05-10] BYOK 키 sign-out 시 다중 prefix 패턴 전체 삭제.
    // localStorage + sessionStorage 양쪽 검사. 누락 키 prevention.
    //
    // 매칭 패턴:
    //   - 'noa_*_key' (default — noa_api_key / noa_openai_key 등)
    //   - 'noa_*key*' (noa_apikey 같은 비표준 변형)
    //   - 'byok_*' (BYOK 별도 prefix)
    //   - 'apikey_*' (legacy)
    const isByokKey = (k: string): boolean => {
      const lower = k.toLowerCase();
      // noa_*_key 또는 noa_*key (key 가 끝 또는 어디든)
      if (lower.startsWith('noa_') && lower.includes('key')) return true;
      if (lower.startsWith('byok_')) return true;
      if (lower.startsWith('apikey_')) return true;
      return false;
    };

    const wipeStorage = (storage: Storage | null): void => {
      if (!storage) return;
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && isByokKey(k)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => storage.removeItem(k));
      } catch {
        // storage 사용 불가 환경 — silent
      }
    };

    wipeStorage(typeof window !== 'undefined' ? window.localStorage : null);
    wipeStorage(typeof window !== 'undefined' ? window.sessionStorage : null);

    const { signOut: firebaseSignOut } = await import('firebase/auth');
    await firebaseSignOut(resolvedAuth);
  };

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const resolvedAuth = await lazyFirebaseAuth();
    const u = resolvedAuth?.currentUser;
    if (!u) return null;
    return u.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.uid ?? null,
        loading,
        signInWithGoogle,
        signOut,
        isConfigured,
        error,
        accessToken,
        refreshAccessToken,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
