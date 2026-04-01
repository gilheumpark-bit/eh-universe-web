import {
  isAllowedNetworkAgentUserId,
  LEGACY_NETWORK_AGENT_USER_PLACEHOLDER,
} from '@/lib/network-agent-auth';

describe('network-agent-auth', () => {
  test('rejects empty userId', () => {
    expect(isAllowedNetworkAgentUserId('')).toBe(false);
    expect(isAllowedNetworkAgentUserId('   ')).toBe(false);
  });

  test('allows normal uid', () => {
    expect(isAllowedNetworkAgentUserId('firebaseUid12345678901234')).toBe(true);
  });

  test('rejects legacy placeholder in production only', () => {
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    expect(isAllowedNetworkAgentUserId(LEGACY_NETWORK_AGENT_USER_PLACEHOLDER)).toBe(false);
    env.NODE_ENV = 'development';
    expect(isAllowedNetworkAgentUserId(LEGACY_NETWORK_AGENT_USER_PLACEHOLDER)).toBe(true);
    env.NODE_ENV = prev;
  });
});
