import { WABI_ROLES } from '../roles';

describe('WABI Roles', () => {
  it('ai-proposer should not be able to decide or approve', () => {
    const aiRole = WABI_ROLES['ai-proposer'];
    expect(aiRole.canDecide).toBe(false);
    expect(aiRole.canApprove).toBe(false);
    expect(aiRole.maxAuthority).toBe('OPTION');
  });

  it('human-author should be able to decide and approve', () => {
    const humanRole = WABI_ROLES['human-author'];
    expect(humanRole.canDecide).toBe(true);
    expect(humanRole.canApprove).toBe(true);
    expect(humanRole.maxAuthority).toBe('FINAL');
  });
});
