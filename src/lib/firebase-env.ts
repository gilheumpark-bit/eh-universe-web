// ============================================================
// firebase-env — 환경 감지 전용 (Firebase SDK 무의존)
// ============================================================
// 2026-04-21 [PERF] firebase.ts에서 분리.
// 이전: `isTestEnvironment`만 import해도 firebase/firestore 전체(100KB)가 번들에 들어옴
//       (Header.tsx가 import → 모든 페이지 100KB 비용)
// 이후: 이 파일은 SDK 의존 0 → Header가 여기서 import → Firebase는 실제 사용 시에만 로드
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

// IDENTITY_SEAL: firebase-env | role=environment detection (zero SDK deps) | inputs=env var | outputs=isTestEnvironment flag
