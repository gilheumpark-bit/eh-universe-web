import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  // Use the site's own domain as authDomain so the OAuth popup runs on
  // the same origin. This avoids "missing initial state" errors caused by
  // third-party storage partitioning in modern browsers (Chrome 115+).
  // The /__/auth/* paths are reverse-proxied to Firebase via next.config.ts rewrites.
  authDomain: typeof window !== 'undefined'
    ? window.location.host
    : (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Only initialize Firebase on the client side, and only if API key is configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
}

export { auth, app };
