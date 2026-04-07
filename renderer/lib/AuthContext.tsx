"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { User, Auth } from 'firebase/auth';
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
      import('firebase/auth').then(({ onAuthStateChanged, getRedirectResult }) => {
        getRedirectResult(resolvedAuth).catch(() => {});
        unsubscribe = onAuthStateChanged(resolvedAuth, (u) => {
          setUser(u);
          setLoading(false);
          if (!u) setAccessToken(null);
        });
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const signInWithGoogle = async () => {
    const resolvedAuth = await lazyFirebaseAuth();
    if (!resolvedAuth) {
      logger.error('Auth', 'Firebase auth is null — not initialized');
      setError('Firebase가 초기화되지 않았습니다. 환경변수를 확인해주세요.');
      return;
    }
    logger.info('Auth', 'signInWithGoogle called');
    setError(null);
    try {
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ 
        prompt: 'select_account consent',
        access_type: 'offline' 
      });
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(resolvedAuth, provider);
        return; 
      }
      const result = await signInWithPopup(resolvedAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setAccessToken(credential?.accessToken ?? null);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(`로그인 실패: ${code || msg}`);
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
    const API_KEY_STORAGE_KEYS = ['noa_api_key', 'noa_openai_key', 'noa_claude_key', 'noa_groq_key', 'noa_mistral_key'];
    API_KEY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
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
