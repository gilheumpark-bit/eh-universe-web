import {
  setBreakpoint,
  removeBreakpoint,
  toggleBreakpoint,
  getAllBreakpoints,
  getBreakpointsForEpisode,
  hasActiveBreakpoint,
  clearAllBreakpoints,
} from '../breakpoint';

describe('breakpoint', () => {
  beforeEach(() => clearAllBreakpoints());

  test('set + get', () => {
    const bp = setBreakpoint({ episodeId: 5, paragraphIdx: 2 }, 'test');
    expect(bp.enabled).toBe(true);
    expect(bp.label).toBe('test');
    expect(getAllBreakpoints()).toHaveLength(1);
  });

  test('toggle', () => {
    const bp = setBreakpoint({ episodeId: 1, paragraphIdx: 0 });
    expect(toggleBreakpoint(bp.id)).toBe(false);
    expect(toggleBreakpoint(bp.id)).toBe(true);
  });

  test('remove', () => {
    const bp = setBreakpoint({ episodeId: 3, paragraphIdx: 1 });
    expect(removeBreakpoint(bp.id)).toBe(true);
    expect(getAllBreakpoints()).toHaveLength(0);
  });

  test('per episode filter', () => {
    setBreakpoint({ episodeId: 1, paragraphIdx: 0 });
    setBreakpoint({ episodeId: 1, paragraphIdx: 1 });
    setBreakpoint({ episodeId: 2, paragraphIdx: 0 });
    expect(getBreakpointsForEpisode(1)).toHaveLength(2);
    expect(getBreakpointsForEpisode(2)).toHaveLength(1);
  });

  test('hasActiveBreakpoint', () => {
    const bp = setBreakpoint({ episodeId: 7, paragraphIdx: 3 });
    expect(hasActiveBreakpoint({ episodeId: 7, paragraphIdx: 3 })).toBe(true);
    toggleBreakpoint(bp.id);
    expect(hasActiveBreakpoint({ episodeId: 7, paragraphIdx: 3 })).toBe(false);
  });
});
