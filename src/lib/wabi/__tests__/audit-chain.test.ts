import { convertChainVerifyResult } from '../audit-chain';

describe('WABI Audit Chain Bridge', () => {
  it('converts invalid chain to WabiChainAuditResult', () => {
    const result = convertChainVerifyResult({ isValid: false, tipHash: 'abc', brokenLinkIndex: 2 });
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('CHAIN_INVALID');
    expect(result.tipHash).toBe('abc');
  });

  it('converts valid chain to WabiChainAuditResult', () => {
    const result = convertChainVerifyResult({ isValid: true, tipHash: 'xyz' });
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.tipHash).toBe('xyz');
  });
});
