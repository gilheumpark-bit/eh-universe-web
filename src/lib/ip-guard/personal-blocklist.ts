/**
 * Personal IP Blocklist — 작가별 권리/IP 점검 확장 목록.
 *
 * 정적 BRAND_BLOCKLIST는 공통 베이스라인이고, 이 모듈은 작가가 작품별로
 * 피하고 싶은 이름, 별칭, 경쟁작, 금지 소재를 더하는 L4 레이어다.
 */

import { collectionName, getDb } from '@/lib/firebase';
import type { BrandCategory, BrandEntry, BrandSeverity } from './brand-blocklist';

export interface PersonalBlocklistEntry {
  readonly id: string;
  readonly term: string;
  readonly aliases: readonly string[];
  readonly category: BrandCategory;
  readonly severity: BrandSeverity;
  readonly updatedAt: string;
}

export interface PersonalBlocklistSyncResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly entries?: readonly PersonalBlocklistEntry[];
}

const STORAGE_KEY = 'loreguard_personal_ip_blocklist_v1';
const DEFAULT_CATEGORY: BrandCategory = 'kr-webnovel';
const DEFAULT_SEVERITY: BrandSeverity = 'warning';

function nowIso(): string {
  return new Date().toISOString();
}

function safeId(term: string): string {
  const normalized = term.normalize('NFKC').trim().toLocaleLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(index)) | 0;
  }
  return `personal-${Math.abs(hash).toString(36)}`;
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

function normalizeAliases(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,\n]/) : [];
  const seen = new Set<string>();
  return raw
    .map(normalizeToken)
    .filter(Boolean)
    .filter((alias) => {
      const key = alias.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function normalizeCategory(value: unknown): BrandCategory {
  const allowed: readonly BrandCategory[] = [
    'us-entertainment',
    'jp-manga-anime',
    'kr-webnovel',
    'kr-webtoon',
    'games',
    'tech-it',
    'luxury-consumer',
    'food-beverage',
    'sports-fashion',
    'film-tv',
  ];
  return allowed.includes(value as BrandCategory) ? value as BrandCategory : DEFAULT_CATEGORY;
}

function normalizeSeverity(value: unknown): BrandSeverity {
  return value === 'critical' || value === 'info' || value === 'warning'
    ? value
    : DEFAULT_SEVERITY;
}

export function normalizePersonalBlocklist(value: unknown): PersonalBlocklistEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: PersonalBlocklistEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Partial<PersonalBlocklistEntry>;
    const term = normalizeToken(source.term);
    if (!term) continue;
    const key = term.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: normalizeToken(source.id) || safeId(term),
      term,
      aliases: normalizeAliases(source.aliases),
      category: normalizeCategory(source.category),
      severity: normalizeSeverity(source.severity),
      updatedAt: normalizeToken(source.updatedAt) || nowIso(),
    });
  }
  return out.slice(0, 200);
}

export function loadPersonalBlocklist(): PersonalBlocklistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizePersonalBlocklist(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function savePersonalBlocklist(entries: readonly PersonalBlocklistEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePersonalBlocklist([...entries])));
    window.dispatchEvent(new CustomEvent('loreguard:personal-ip-blocklist-changed'));
  } catch {
    // 저장소가 막힌 환경에서도 본문 흐름은 깨지지 않아야 한다.
  }
}

export function upsertPersonalBlocklistTerm(
  entries: readonly PersonalBlocklistEntry[],
  termInput: string,
  aliasesInput = '',
  severity: BrandSeverity = DEFAULT_SEVERITY,
): PersonalBlocklistEntry[] {
  const term = normalizeToken(termInput);
  if (!term) return normalizePersonalBlocklist([...entries]);
  const aliases = normalizeAliases(aliasesInput);
  const nextEntry: PersonalBlocklistEntry = {
    id: safeId(term),
    term,
    aliases,
    category: DEFAULT_CATEGORY,
    severity,
    updatedAt: nowIso(),
  };
  const next = normalizePersonalBlocklist([
    ...entries.filter((entry) => entry.term.toLocaleLowerCase() !== term.toLocaleLowerCase()),
    nextEntry,
  ]);
  return next.sort((left, right) => left.term.localeCompare(right.term, 'ko'));
}

export function removePersonalBlocklistTerm(
  entries: readonly PersonalBlocklistEntry[],
  id: string,
): PersonalBlocklistEntry[] {
  return normalizePersonalBlocklist(entries.filter((entry) => entry.id !== id));
}

export function personalBlocklistToBrandEntries(
  entries: readonly PersonalBlocklistEntry[],
): BrandEntry[] {
  return normalizePersonalBlocklist([...entries]).map((entry) => ({
    canonical: entry.term,
    category: entry.category,
    severity: entry.severity,
    aliases: entry.aliases,
    owner: '작가 개인 목록',
  }));
}

function personalBlocklistDocPath(uid: string): [string, string, string, string] {
  return [collectionName('users'), uid, 'settings', 'personalIpBlocklist'];
}

export async function pushPersonalBlocklistToCloud(
  uid: string | null | undefined,
  entries: readonly PersonalBlocklistEntry[],
): Promise<PersonalBlocklistSyncResult> {
  if (!uid) return { ok: false, reason: 'no_user' };
  const db = getDb();
  if (!db) return { ok: false, reason: 'firebase_disabled' };
  try {
    const { doc, serverTimestamp, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, ...personalBlocklistDocPath(uid)), {
      entries: normalizePersonalBlocklist([...entries]),
      updatedAt: serverTimestamp(),
      schema: 'loreguard.personal-ip-blocklist.v1',
    }, { merge: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export async function pullPersonalBlocklistFromCloud(
  uid: string | null | undefined,
): Promise<PersonalBlocklistSyncResult> {
  if (!uid) return { ok: false, reason: 'no_user' };
  const db = getDb();
  if (!db) return { ok: false, reason: 'firebase_disabled' };
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, ...personalBlocklistDocPath(uid)));
    if (!snap.exists()) return { ok: true, entries: [] };
    const entries = normalizePersonalBlocklist((snap.data() as { entries?: unknown }).entries);
    savePersonalBlocklist(entries);
    return { ok: true, entries };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export const PERSONAL_BLOCKLIST_STORAGE_KEY = STORAGE_KEY;

