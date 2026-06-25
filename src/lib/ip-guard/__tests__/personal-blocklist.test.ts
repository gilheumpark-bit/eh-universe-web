import { scanTextForIP } from '../scan';
import {
  normalizePersonalBlocklist,
  personalBlocklistToBrandEntries,
  upsertPersonalBlocklistTerm,
} from '../personal-blocklist';

describe('personal IP blocklist', () => {
  it('normalizes writer-defined terms without duplicate entries', () => {
    const entries = normalizePersonalBlocklist([
      { term: '검은 왕관', aliases: ['흑관', '흑관'], severity: 'critical' },
      { term: '검은 왕관', aliases: ['중복'] },
      { term: '' },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].term).toBe('검은 왕관');
    expect(entries[0].aliases).toEqual(['흑관']);
    expect(entries[0].severity).toBe('critical');
  });

  it('extends the static scanner instead of replacing the baseline blocklist', () => {
    const personal = upsertPersonalBlocklistTerm([], '검은 왕관', '흑관', 'critical');
    const customBlocklist = personalBlocklistToBrandEntries(personal);

    const result = scanTextForIP('스파이더맨 같은 영웅과 흑관 설정은 피한다.', {
      customBlocklist,
    });

    const matched = result.brands.map((flag) => flag.entry.canonical);
    expect(matched).toContain('Spider-Man');
    expect(matched).toContain('검은 왕관');
  });
});

