"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isConfigured: false,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = auth !== null;

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
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
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? '';
      // 사용자가 팝업 닫은 경우는 에러 무시
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(`로그인 실패: ${code || msg}`);
      console.error('[Auth] signInWithGoogle error', err);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, isConfigured, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
