// ============================================================
// PART 1 — Firestore 프로젝트 동기화 모듈
// 세션 데이터를 Firestore에 자동 동기화.
// feature-flag CLOUD_SYNC=true 일 때만 활성.
// ============================================================

import { logger } from '@/lib/logger';
import { getDb, collectionName } from '@/lib/firebase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Project = any; // useProjectManager의 Project 타입 — 순환 참조 방지

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

// ============================================================
// PART 2 — 동기화 함수
// ============================================================

/** Firestore에 프로젝트 목록 저장 (merge 모드) */
export async function syncProjectsToFirestore(uid: string, projects: Project[]): Promise<void> {
  const db = getDb();
  if (!db || !uid || !projects.length) return;

  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const colName = collectionName('studio-sessions');

    const results = await Promise.allSettled(
      projects.map(p =>
        setDoc(doc(db, colName, uid, 'projects', p.id), {
          ...p,
          lastSync: Date.now(),
        }, { merge: true })
      )
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      logger.warn('cloud-sync', `${failed}/${projects.length} projects failed to sync`);
    } else {
      logger.info('cloud-sync', `${projects.length} projects synced to Firestore`);
    }
  } catch (err) {
    logger.warn('cloud-sync', `Firestore sync failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

/** 디바운스 래퍼 — 3초 이내 중복 호출 방지 */
export function debouncedSyncToFirestore(uid: string, projects: Project[]): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    syncProjectsToFirestore(uid, projects);
  }, DEBOUNCE_MS);
}

// ============================================================
// PART 3 — 로드 + 실시간 구독
// ============================================================

/** Firestore에서 프로젝트 목록 로드 */
export async function loadProjectsFromFirestore(uid: string): Promise<Project[] | null> {
  const db = getDb();
  if (!db || !uid) return null;

  try {
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
    const colName = collectionName('studio-sessions');
    const q = query(collection(db, colName, uid, 'projects'), orderBy('lastSync', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) return null;
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
  } catch (err) {
    logger.warn('cloud-sync', `Firestore load failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

/** 실시간 프로젝트 변경 구독 — 크로스 디바이스 동기화 */
export async function subscribeToProjectChanges(
  uid: string,
  onUpdate: (projects: Project[]) => void,
): Promise<() => void> {
  const db = getDb();
  if (!db || !uid) return () => {};

  try {
    const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
    const colName = collectionName('studio-sessions');
    const q = query(collection(db, colName, uid, 'projects'), orderBy('lastSync', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const projects = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
      onUpdate(projects);
    }, (err) => {
      logger.warn('cloud-sync', `Snapshot listener error: ${err.message}`);
    });

    return unsub;
  } catch (err) {
    logger.warn('cloud-sync', `Subscribe failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return () => {};
  }
}
