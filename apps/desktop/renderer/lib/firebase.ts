/**
 * Desktop build: Firebase Auth is optional. Lazy loader returns a Firebase-shaped
 * object with `currentUser: null` so `/api/chat` can run without Bearer tokens.
 */

export interface LazyFirebaseAuthLike {
  currentUser: { getIdToken: () => Promise<string> } | null;
}

let cached: Promise<LazyFirebaseAuthLike> | null = null;

export async function lazyFirebaseAuth(): Promise<LazyFirebaseAuthLike> {
  if (!cached) {
    cached = Promise.resolve({ currentUser: null });
  }
  return cached;
}
