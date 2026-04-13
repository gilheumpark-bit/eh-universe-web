"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for chaos-engineering module
 */
describe('chaos-engineering', () => {
    it('module loads without error', () => {
        expect(() => require('../chaos-engineering')).not.toThrow();
    });
    it('exports chaos functions', () => {
        const mod = require('../chaos-engineering');
        expect(typeof mod).toBe('object');
    });
});
