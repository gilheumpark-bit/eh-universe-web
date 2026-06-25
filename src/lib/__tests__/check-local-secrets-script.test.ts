import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = join(process.cwd(), 'scripts', 'check-local-secrets.mjs');

function runSecretScan(envText: string, args: string[] = []) {
  const tempDir = mkdtempSync(join(tmpdir(), 'loreguard-secret-scan-'));
  writeFileSync(join(tempDir, '.env.local'), envText, 'utf8');
  try {
    return spawnSync(process.execPath, [scriptPath, ...args], {
      cwd: tempDir,
      encoding: 'utf8',
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('check-local-secrets operational env locks', () => {
  it('blocks checkout when the feature flag is on without required payment env', () => {
    const result = runSecretScan('FEATURE_STRIPE_CHECKOUT=on\n');

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('checkout-env-incomplete');
    expect(result.stdout).toContain('STRIPE_SECRET_KEY');
    expect(result.stdout).toContain('STRIPE_WEBHOOK_SECRET');
  });

  it('blocks payment live when distributed limits and claim sync env are incomplete', () => {
    const result = runSecretScan(
      [
        'NEXT_PUBLIC_PAYMENT_LIVE=true',
        'FEATURE_STRIPE_CHECKOUT=on',
        'STRIPE_SECRET_KEY=sk_test_placeholder',
        'STRIPE_WEBHOOK_SECRET=whsec_placeholder',
        'STRIPE_PRICE_ID_PRO=price_placeholder',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project',
      ].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('payment-live-env-incomplete');
    expect(result.stdout).toContain('VERTEX_AI_CREDENTIALS');
    expect(result.stdout).toContain('UPSTASH_REDIS_REST_URL');
    expect(result.stdout).toContain('UPSTASH_REDIS_REST_TOKEN');
    expect(result.stdout).not.toContain('sk_test_placeholder');
    expect(result.stdout).not.toContain('whsec_placeholder');
  });

  it('reports blocking local findings without failing in warn-only mode', () => {
    const result = runSecretScan('FEATURE_STRIPE_CHECKOUT=on\n', ['--warn-only']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('WARN-ONLY');
    expect(result.stdout).toContain('checkout-env-incomplete');
  });
});
