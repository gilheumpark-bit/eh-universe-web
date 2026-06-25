jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { sha256Hex } from '@/lib/crypto-sha256';

describe('crypto-sha256', () => {
  test('computes known SHA-256 values', async () => {
    await expect(sha256Hex('')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb924' +
        '27ae41e4649b934ca495991b7852b855',
    );
    await expect(sha256Hex('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223' +
        'b00361a396177a9cb410ff61f20015ad',
    );
  });
});
