"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for audit-types module
 */
describe('audit-types', () => {
    it('module loads without error', () => { expect(() => require('../audit-types')).not.toThrow(); });
    it('exports type definitions', () => { expect(typeof require('../audit-types')).toBe('object'); });
});
