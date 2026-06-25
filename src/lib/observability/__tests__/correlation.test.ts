import { getCorrelationId, withCorrelationHeaders } from '../correlation';

beforeEach(() => {
  try { window.sessionStorage.clear(); } catch { /* jsdom */ }
});

describe('getCorrelationId', () => {
  it('생성 + 세션 내 동일 ID 유지', () => {
    const a = getCorrelationId();
    const b = getCorrelationId();
    expect(a).toMatch(/^cid_/);
    expect(a).toBe(b); // 영속
  });
});

describe('withCorrelationHeaders', () => {
  it('x-correlation-id 부착 + 기존 헤더 보존', () => {
    const h = withCorrelationHeaders({ 'Content-Type': 'application/json' });
    expect(h['Content-Type']).toBe('application/json');
    expect(h['x-correlation-id']).toMatch(/^cid_/);
    expect(h['x-correlation-id']).toBe(getCorrelationId());
  });
  it('인자 없이도 동작', () => {
    expect(withCorrelationHeaders()['x-correlation-id']).toMatch(/^cid_/);
  });
});
