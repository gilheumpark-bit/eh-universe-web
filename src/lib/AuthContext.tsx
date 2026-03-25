"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, reauthenticateWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  error: string | null;
  accessToken: string | null;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isConfigured: false,
  error: null,
  accessToken: null,
  refreshAccessToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(auth !== null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isConfigured = auth !== null;

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // Clear token when user logs out or session expires
      if (!u) setAccessToken(null);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      setError('Firebase가 초기화되지 않았습니다. 환경변수를 확인해주세요.');
      return;
    }
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setAccessToken(credential?.accessToken ?? null);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(`로그인 실패: ${code || msg}`);
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] signInWithGoogle error', err);
      }
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!auth) return null;
    // Firebase OAuth에서 Drive 토큰 갱신은 재인증이 필요합니다.
    // reauthenticateWithPopup을 먼저 시도하고, 실패 시 signInWithPopup으로 폴백합니다.
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');

      let credential: import('firebase/auth').OAuthCredential | null = null;
      const currentUser = auth.currentUser;

      if (currentUser) {
        // 이미 로그인된 상태 → reauthenticate (팝업 최소화)
        try {
          const result = await reauthenticateWithPopup(currentUser, provider);
          credential = GoogleAuthProvider.credentialFromResult(result);
        } catch {
          // reauthenticate 실패 → 전체 로그인으로 폴백
          const result = await signInWithPopup(auth, provider);
          credential = GoogleAuthProvider.credentialFromResult(result);
        }
      } else {
        const result = await signInWithPopup(auth, provider);
        credential = GoogleAuthProvider.credentialFromResult(result);
      }

      const token = credential?.accessToken ?? null;
      setAccessToken(token);
      return token;
    } catch {
      return null;
    }
  }, []);

  const signOut = async () => {
    if (!auth) return;
    setAccessToken(null);
    // Clear all stored API keys on logout
    const API_KEY_STORAGE_KEYS = ['noa_api_key', 'noa_openai_key', 'noa_claude_key', 'noa_groq_key', 'noa_mistral_key'];
    API_KEY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, isConfigured, error, accessToken, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
