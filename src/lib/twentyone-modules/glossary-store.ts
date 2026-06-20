// ============================================================
// twentyone-modules/glossary-store.ts
// — M4 IDB CRUD wrapper.
// ============================================================

import type { GlossaryEntry } from './types';
import {
  STORE_GLOSSARY_ENTRIES,
  putRecord,
  getRecord,
  listByIndex,
  deleteRecord,
} from './idb-store';

/** Save (insert or update) a glossary entry. */
export async function saveGlossaryEntry(entry: GlossaryEntry): Promise<GlossaryEntry> {
  return putRecord<GlossaryEntry>(STORE_GLOSSARY_ENTRIES, entry);
}

/** Get a single glossary entry by ID. */
export async function getGlossaryEntry(id: string): Promise<GlossaryEntry | undefined> {
  return getRecord<GlossaryEntry>(STORE_GLOSSARY_ENTRIES, id);
}

/** List all glossary entries for a work. */
export async function listGlossaryByWork(workId: string): Promise<GlossaryEntry[]> {
  return listByIndex<GlossaryEntry>(STORE_GLOSSARY_ENTRIES, 'by_work', workId);
}

/** List candidates only (auto-extracted, awaiting approval). */
export async function listCandidates(workId: string): Promise<GlossaryEntry[]> {
  const all = await listGlossaryByWork(workId);
  return all.filter((e) => e.status === 'candidate');
}

/** List approved entries (for Compliance hook scans). */
export async function listApprovedGlossary(workId: string): Promise<GlossaryEntry[]> {
  const all = await listGlossaryByWork(workId);
  return all.filter((e) => e.status === 'approved' || e.status === 'locked');
}

/** Delete a glossary entry. */
export async function removeGlossaryEntry(id: string): Promise<void> {
  return deleteRecord(STORE_GLOSSARY_ENTRIES, id);
}
