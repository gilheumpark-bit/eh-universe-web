/** Legacy dev placeholder — rejected in production API routes. */
export const LEGACY_NETWORK_AGENT_USER_PLACEHOLDER = "test-session-user123";

export function isAllowedNetworkAgentUserId(userId: string): boolean {
  if (!userId.trim()) return false;
  if (process.env.NODE_ENV === "production" && userId === LEGACY_NETWORK_AGENT_USER_PLACEHOLDER) {
    return false;
  }
  return true;
}
