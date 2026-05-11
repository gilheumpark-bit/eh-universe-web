import {
  createGlossaryEntry,
  findCollisions,
  approveCandidate,
  runGlossarySurfaceFormCheck,
  extractCandidates,
} from '../glossary-extractor';
import type { GlossaryEntry } from '../types';

const baseEntry = (override: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  id: 'gl-base',
  work_id: 'w1',
  schema_version: '1.0.0',
  created_at: '2026-05-11T00:00:00Z',
  updated_at: '2026-05-11T00:00:00Z',
  canonical_name: 'Mareh',
  aliases: ['the saint'],
  entity_type: 'person',
  status: 'approved',
  source: 'manual',
  confidence: 1,
  spoiler_tier: 'mid',
  first_appearance_planned: 5,
  first_appearance_actual: null,
  occurrence_count: 0,
  last_seen_episode: null,
  forbidden_surface_forms: ['Mereh', '마레흐'],
  approved_at: '2026-05-11T00:00:00Z',
  approved_by: 'author',
  ...override,
});

describe('twentyone-modules/glossary-extractor', () => {
  describe('createGlossaryEntry', () => {
    it('builds a candidate with sensible defaults', () => {
      const entry = createGlossaryEntry({
        work_id: 'w1',
        canonical_name: 'Solrune',
        entity_type: 'artifact',
        source: 'manual',
      });
      expect(entry.status).toBe('candidate');
      expect(entry.confidence).toBe(1); // manual → 1.0
      expect(entry.spoiler_tier).toBe('public');
      expect(entry.aliases).toEqual([]);
    });
  });

  describe('findCollisions', () => {
    it('detects exact canonical match (similarity 1.0)', () => {
      const existing = [baseEntry()];
      const collisions = findCollisions(
        { canonical_name: 'Mareh', aliases: [] },
        existing,
      );
      expect(collisions).toHaveLength(1);
      expect(collisions[0].similarity).toBe(1.0);
    });

    it('detects alias-as-name overlap (similarity 0.8)', () => {
      const existing = [baseEntry()];
      const collisions = findCollisions(
        { canonical_name: 'the saint', aliases: [] },
        existing,
      );
      expect(collisions).toHaveLength(1);
      expect(collisions[0].similarity).toBeCloseTo(0.8);
    });

    it('detects aliases-only overlap (similarity 0.5)', () => {
      const existing = [baseEntry({ canonical_name: 'Other', aliases: ['shared-alias'] })];
      const collisions = findCollisions(
        { canonical_name: 'Mareh', aliases: ['shared-alias'] },
        existing,
      );
      expect(collisions).toHaveLength(1);
      expect(collisions[0].similarity).toBe(0.5);
    });

    it('filters below threshold', () => {
      const existing = [baseEntry({ canonical_name: 'Other', aliases: ['shared-alias'] })];
      const collisions = findCollisions(
        { canonical_name: 'Mareh', aliases: ['shared-alias'] },
        existing,
        0.7,  // higher threshold filters the 0.5 overlap
      );
      expect(collisions).toHaveLength(0);
    });
  });

  describe('approveCandidate', () => {
    it('promotes candidate to approved', () => {
      const candidate = createGlossaryEntry({
        work_id: 'w1',
        canonical_name: 'Test',
        entity_type: 'person',
        source: 'auto_extracted',
      });
      expect(candidate.status).toBe('candidate');
      const approved = approveCandidate(candidate);
      expect(approved.status).toBe('approved');
      expect(approved.approved_by).toBe('author');
      expect(approved.approved_at).toBeTruthy();
    });

    it('throws on non-candidate input', () => {
      const approved = baseEntry(); // status: 'approved'
      expect(() => approveCandidate(approved)).toThrow(/Cannot approve/);
    });
  });

  describe('runGlossarySurfaceFormCheck', () => {
    it('emits warning when forbidden surface form found', () => {
      const findings = runGlossarySurfaceFormCheck({
        manuscript: 'In the morning, 마레흐 appeared at the gate.',
        entries: [baseEntry()],
        current_episode: 5,
      });
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warning');
      expect(findings[0].suggested_fix).toContain('Mareh');
    });

    it('skips candidate-status entries', () => {
      const findings = runGlossarySurfaceFormCheck({
        manuscript: 'In the morning, 마레흐 appeared at the gate.',
        entries: [baseEntry({ status: 'candidate' })],
        current_episode: 5,
      });
      expect(findings).toHaveLength(0);
    });
  });

  describe('extractCandidates (stub)', () => {
    it('extracts [[Name]] and [[Name|alias]] patterns', async () => {
      const result = await extractCandidates(
        'Meet [[Aurora]] of [[Solrune|Sol|the orb]] at midnight.',
        [],
      );
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates[0].canonical_name).toBe('Aurora');
      expect(result.candidates[1].canonical_name).toBe('Solrune');
      expect(result.candidates[1].aliases).toEqual(['Sol', 'the orb']);
    });

    it('returns empty for manuscripts without marker patterns', async () => {
      const result = await extractCandidates('Plain text without markers.', []);
      expect(result.candidates).toHaveLength(0);
      expect(result.total_scanned_chars).toBe('Plain text without markers.'.length);
    });
  });
});
