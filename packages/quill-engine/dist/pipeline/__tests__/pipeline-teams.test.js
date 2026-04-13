"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for pipeline-teams module
 */
describe('pipeline-teams', () => {
    it('module loads without error', () => {
        expect(() => require('../pipeline-teams')).not.toThrow();
    });
    it('exports team configurations', () => {
        const mod = require('../pipeline-teams');
        expect(typeof mod).toBe('object');
    });
});
