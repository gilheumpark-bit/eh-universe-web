import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Firebase config for project "NOA STUDIO" (gen-lang-client-0645063497).
// All values are hardcoded because the Vercel env vars point to a different
// project ("eh-universe" / 169294097312) which causes auth/invalid-continue-uri.
// Source: Firebase Console → Project Settings → SDK setup and configuration.
const firebaseConfig = {
  apiKey: 'AIzaSyDJJEidy9jsLh-5hh3_eAnqFhISp53epXM',
  authDomain: 'gen-lang-client-0645063497.firebaseapp.com',
  projectId: 'gen-lang-client-0645063497',
  storageBucket: 'gen-lang-client-0645063497.firebasestorage.app',
  messagingSenderId: '262025911233',
  appId: '1:262025911233:web:e49fe5b774538b808f2d40',
};

// Only initialize Firebase on the client side, and only if API key is configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
}

export { auth, app };
