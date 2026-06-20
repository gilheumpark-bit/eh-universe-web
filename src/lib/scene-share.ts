// ============================================================
// Scene Share — 공유 링크 생성/조회 (Firestore 기반)
// ============================================================
// 서버 불필요. Vercel + Firestore 서버리스로 동작.

// ============================================================
// PART 1 — Types
// ============================================================

import type { ParsedScene, VoiceMapping } from '@/engine/scene-parser';

export interface SharedSceneData {
  token: string;
  title: string;
  scenes: ParsedScene[];
  voiceMappings: VoiceMapping[];
  backgroundUrls?: Record<string, string>;
  createdAt: number;
  expiresAt: number;
  password?: string;
  feedbackEnabled: boolean;
  authorName?: string;
}

export interface ShareOptions {
  title: string;
  scenes: ParsedScene[];
  voiceMappings: VoiceMapping[];
  backgroundUrls?: Record<string, string>;
  expiryDays: 1 | 7 | 30 | 365;
  password?: string;
  feedbackEnabled?: boolean;
  authorName?: string;
}

export interface SceneFeedback {
  id: string;
  token: string;
  sceneIndex: number;
  beatIndex?: number;
  comment: string;
  author: string;
  createdAt: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SharedSceneData,ShareOptions,SceneFeedback

// ============================================================
// PART 2 — 토큰 생성
// ============================================================

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let token = '';
  const array = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    for (const byte of array) token += chars[byte % chars.length];
  } else {
    for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// IDENTITY_SEAL: PART-2 | role=token-gen | inputs=none | outputs=string

// ============================================================
// PART 3 — Firestore 저장/조회
// ============================================================

/** Hash a password string using SHA-256 and return hex digest */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// P0#5 fix: Firebase 인스턴스 캐싱 (중복 초기화 방지)
import type { Firestore } from 'firebase/firestore';
let _dbCache: Firestore | null = null;
let _dbPromise: Promise<Firestore | null> | null = null;

async function getFirestore() {
  if (_dbCache) return _dbCache;
  if (_dbPromise) return _dbPromise;
  _dbPromise = import('@/lib/firebase').then(({ getDb }) => {
    _dbCache = getDb();
    return _dbCache;
  });
  return _dbPromise;
}

/** 공유 링크 생성 → Firestore에 저장 → 토큰 반환 */
export async function createShareLink(options: ShareOptions): Promise<string> {
  const db = await getFirestore();
  if (!db) throw new Error('Firestore not available');

  const { doc, setDoc } = await import('firebase/firestore');
  const token = generateToken();
  const now = Date.now();

  const hashedPw = options.password ? await hashPassword(options.password) : undefined;

  const data: SharedSceneData = {
    token,
    title: options.title,
    scenes: options.scenes,
    voiceMappings: options.voiceMappings,
    backgroundUrls: options.backgroundUrls,
    createdAt: now,
    expiresAt: now + options.expiryDays * 24 * 60 * 60 * 1000,
    password: hashedPw,
    feedbackEnabled: options.feedbackEnabled ?? false,
    authorName: options.authorName,
  };

  await setDoc(doc(db, 'shared-scenes', token), data);
  return token;
}

/** 토큰으로 공유 데이터 조회 */
export async function loadSharedScene(token: string): Promise<SharedSceneData | null> {
  const db = await getFirestore();
  if (!db) return null;

  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'shared-scenes', token));
  if (!snap.exists()) return null;

  const data = snap.data() as SharedSceneData;

  // 만료 체크
  if (data.expiresAt < Date.now()) return null;

  return data;
}

/** 비밀번호 검증 (SHA-256 해시 비교) */
export async function verifyPassword(data: SharedSceneData, input: string): Promise<boolean> {
  if (!data.password) return true;
  const inputHash = await hashPassword(input);
  return data.password === inputHash;
}

// IDENTITY_SEAL: PART-3 | role=firestore-crud | inputs=ShareOptions,token | outputs=SharedSceneData

// ============================================================
// PART 4 — 피드백 저장/조회
// ============================================================

export async function saveFeedback(feedback: Omit<SceneFeedback, 'id' | 'createdAt'>): Promise<void> {
  const db = await getFirestore();
  if (!db) return;

  const { collection, addDoc } = await import('firebase/firestore');
  await addDoc(collection(db, 'shared-scenes', feedback.token, 'feedback'), {
    ...feedback,
    createdAt: Date.now(),
  });
}

export async function loadFeedbacks(token: string): Promise<SceneFeedback[]> {
  const db = await getFirestore();
  if (!db) return [];

  const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
  const q = query(collection(db, 'shared-scenes', token, 'feedback'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SceneFeedback);
}

// IDENTITY_SEAL: PART-4 | role=feedback | inputs=SceneFeedback | outputs=SceneFeedback[]

// ============================================================
// PART 5 — URL 기반 공유 (Firestore 없이, 소규모 데이터용)
// ============================================================

/** 장면 데이터를 URL-safe base64로 인코딩 (4KB 미만용) */
export function encodeSceneToUrl(scenes: ParsedScene[], title: string): string {
  const minimal = {
    t: title,
    s: scenes.map((sc) => ({
      i: sc.index,
      n: sc.title,
      m: sc.mood,
      d: sc.timeOfDay,
      tn: sc.tension,
      b: sc.beats.map((bt) => ({
        y: bt.type[0],  // d/n/a/t/e → 1글자
        s: bt.speaker,
        x: bt.text,
      })),
    })),
  };

  const json = JSON.stringify(minimal);
  if (typeof window !== 'undefined') {
    // [C] 레거시 escape/unescape 금지 — TextEncoder로 UTF-8 안전 인코딩.
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return Buffer.from(json).toString('base64');
}

/** URL-safe base64에서 장면 복원 */
export function decodeSceneFromUrl(encoded: string): { title: string; scenes: ParsedScene[] } | null {
  try {
    let json: string;
    if (typeof window !== 'undefined') {
      // [C] 레거시 escape/unescape 금지 — TextDecoder로 UTF-8 안전 디코딩.
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = new TextDecoder().decode(bytes);
    } else {
      json = Buffer.from(encoded, 'base64').toString('utf-8');
    }

    const minimal = JSON.parse(json);
    const TYPE_MAP: Record<string, string> = { d: 'dialogue', n: 'narration', a: 'action', t: 'thought', e: 'description' };

    const scenes: ParsedScene[] = minimal.s.map((sc: Record<string, unknown>) => ({
      id: `scene_${sc.i}`,
      index: sc.i as number,
      title: sc.n as string,
      mood: sc.m as string | undefined,
      timeOfDay: sc.d as string | undefined,
      tension: sc.tn as number,
      beats: (sc.b as Record<string, unknown>[]).map((bt, bi: number) => ({
        id: `beat_${sc.i}_${bi}`,
        type: TYPE_MAP[(bt.y as string)] ?? 'narration',
        speaker: bt.s as string | undefined,
        text: bt.x as string,
        tempo: 'normal' as const,
        camera: 'medium' as const,
        lineStart: 0,
        lineEnd: 0,
      })),
    }));

    return { title: minimal.t, scenes };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-5 | role=url-encoding | inputs=ParsedScene[],title | outputs=base64-string
