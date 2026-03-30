import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 - ENVIRONMENT DETECTION
// ============================================================

/**
 * NEXT_PUBLIC_FIREBASE_ENV controls which Firebase project configuration is used.
 * - "production" (default): uses the production Firebase project
 * - "test" or "development": uses the test Firebase project (same project, "test_" collection prefix awareness)
 *
 * Set this in .env.local or Vercel environment variables.
 */
const FIREBASE_ENV = (
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_FIREBASE_ENV
    : undefined
) ?? 'production';

export const isTestEnvironment = FIREBASE_ENV === 'test' || FIREBASE_ENV === 'development';

// IDENTITY_SEAL: PART-1 | role=environment detection | inputs=env var | outputs=isTestEnvironment flag

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
    auth = getAuth(app);
    db = getFirestore(app);

    if (isTestEnvironment) {
      console.info('[EH Universe] Running in TEST environment. Firebase project:', firebaseConfig.projectId);
    }
  }
}

export { auth, app, db };

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

// IDENTITY_SEAL: PART-2 | role=firebase initialization | inputs=env-based config | outputs=firebase app, auth, db singletons
