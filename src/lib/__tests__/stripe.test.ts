import { sanitizeStripeReturnBase } from '@/lib/stripe';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('sanitizeStripeReturnBase', () => {
  it('returns the configured app origin for same-origin return URLs', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://loreguard.example/app';

    expect(sanitizeStripeReturnBase('https://loreguard.example/payment/success?x=1'))
      .toBe('https://loreguard.example');
  });

  it('rejects external origins and falls back to the configured app origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://loreguard.example';

    expect(sanitizeStripeReturnBase('https://evil.example/steal'))
      .toBe('https://loreguard.example');
  });

  it('rejects malformed and relative return URLs', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://loreguard.example';

    expect(sanitizeStripeReturnBase('not a url')).toBe('https://loreguard.example');
    expect(sanitizeStripeReturnBase('/payment/success')).toBe('https://loreguard.example');
  });

  it('falls back to localhost when NEXT_PUBLIC_APP_URL is malformed', () => {
    process.env.NEXT_PUBLIC_APP_URL = '::bad-url::';

    expect(sanitizeStripeReturnBase('https://loreguard.example/payment/success'))
      .toBe('http://localhost:3000');
  });
});
