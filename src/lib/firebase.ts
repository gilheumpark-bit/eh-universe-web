import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 - ENVIRONMENT DETECTION (re-export from firebase-env.ts)
// ============================================================
// 2026-04-21 [PERF] isTestEnvironment를 firebase-env.ts로 분리하여
// Firebase SDK 무의존 import 가능하게 함. 후방 호환을 위해 재-export.
// 신규 코드는 `@/lib/firebase-env`에서 직접 import 권장.
import { isTestEnvironment } from './firebase-env';
export { isTestEnvironment };

// ============================================================
// PART 2 - FIREBASE CONFIG AND INITIALIZATION
// ============================================================

// Production Firebase config — read from NEXT_PUBLIC_FIREBASE_* env vars.
// NO hardcoded fallbacks. If env vars are missing, Firebase features are disabled.
// This prevents env misconfiguration from silently connecting to a wrong project.
const productionConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

// Test environment config — same project but can be overridden via env vars.
// To use a fully separate test project, set NEXT_PUBLIC_FIREBASE_TEST_* env vars.
const testConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_TEST_API_KEY ?? productionConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_TEST_AUTH_DOMAIN ?? productionConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_TEST_PROJECT_ID ?? productionConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_TEST_STORAGE_BUCKET ?? productionConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_TEST_MESSAGING_SENDER_ID ?? productionConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_TEST_APP_ID ?? productionConfig.appId,
};

const firebaseConfig = isTestEnvironment ? testConfig : productionConfig;

// Only initialize Firebase on the client side, and only if API key is configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  const missing = (
    ['apiKey', 'authDomain', 'projectId', 'appId'] as const
  ).filter((k) => !firebaseConfig[k]);

  if (missing.length > 0) {
    logger.warn('EH Universe', `Firebase config incomplete — missing: ${missing.join(', ')}. Auth features disabled.`);
  } else {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    // Auth is no longer eagerly initialized to save bundle size
    db = getFirestore(app);

    if (isTestEnvironment) {
      logger.info('[EH Universe] Running in TEST environment. Firebase project:', firebaseConfig.projectId);
    }
  }
}

export { auth, app, db };

/** Safe getter for Firebase Auth — cleanly lazy loads the auth module */
export async function lazyFirebaseAuth(): Promise<Auth | null> {
  if (auth) return auth;
  if (!app) return null;
  const { getAuth } = await import('firebase/auth');
  auth = getAuth(app);
  return auth;
}

/** Safe getter for Firestore — avoids Turbopack tree-shaking issues */
export function getDb(): Firestore | null {
  return db;
}

/**
 * 컬렉션 이름에 테스트 프리픽스를 적용.
 * test/development 환경에서는 "test_" 프리픽스를 붙여서
 * 라이브 데이터와 분리.
 */
export function collectionName(name: string): string {
  return isTestEnvironment ? `test_${name}` : name;
}

/** Lazy Firebase loader — use when dynamic import('firebase/...') is preferred over top-level import */
export async function lazyFirestore() {
  const mod = await import('firebase/firestore');
  return { ...mod, db };
}

// IDENTITY_SEAL: PART-2 | role=firebase initialization | inputs=env-based config | outputs=firebase app, auth, db singletons
