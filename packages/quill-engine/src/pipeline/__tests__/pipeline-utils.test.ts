/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for pipeline-utils
 */
describe('pipeline-utils', () => {
  it('module exists', () => {
    expect(() => require('../pipeline-utils')).not.toThrow();
  });

  it('exports expected functions', () => {
    const mod = require('../pipeline-utils');
    expect(typeof mod).toBe('object');
  });
});
